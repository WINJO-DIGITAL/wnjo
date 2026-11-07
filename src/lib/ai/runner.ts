import { ProviderError, type AiProvider, type ProviderMessage } from "@/lib/ai/provider";
import type { ToolRegistry, ToolContext } from "@/lib/ai/tools";
import { decideToolUse } from "@/lib/ai/policy";
import { checkBudgets, type BudgetLimit } from "@/lib/ai/budget";

/**
 * Runs one agent task. It is bounded in every direction: attempts, model calls per attempt, spend per task,
 * and time per call. It never retries an authentication or permission problem, and it never loops forever.
 */

export type AgentRecord = { enabled: boolean; paused: boolean };

/** Everything the runner reads or writes goes through this port, so it can be tested without a database. */
export interface RunStore {
  loadTask(taskId: string): Promise<{ id: string; tenantId: string; agentKey: string; projectId: string | null; title: string; status: string; attempts: number; maxAttempts: number; budgetPence: number; spentPence: number }>;
  loadAgent(tenantId: string, agentKey: string): Promise<AgentRecord | null>;
  loadPermissions(tenantId: string, agentKey: string): Promise<Record<string, boolean>>;
  setTaskStatus(taskId: string, status: string, patch?: { attempts?: number; spentPence?: number }): Promise<void>;
  startRun(input: { taskId: string; tenantId: string; attempt: number; provider: string; model: string }): Promise<string>;
  finishRun(runId: string, input: { status: "succeeded" | "failed" | "stopped"; inputTokens: number; outputTokens: number; costPence: number; error?: string }): Promise<void>;
  recordToolCall(input: { runId: string; tenantId: string; tool: string; allowed: boolean; denialReason?: string; args: Record<string, unknown>; resultSummary?: string }): Promise<void>;
}

export type RunOutcome =
  | { status: "succeeded"; text: string }
  | { status: "awaiting_approval"; tool: string; reason: string }
  | { status: "suspended"; reason: string }
  | { status: "failed"; reason: string };

export const MAX_MODEL_CALLS_PER_ATTEMPT = 8;

export async function runTask(input: {
  taskId: string;
  provider: AiProvider;
  tools: ToolRegistry;
  store: RunStore;
  system: string;
  approvedTools?: string[];
  /** Wait before retrying a transient error. Defaults to exponential backoff; tests pass 0. */
  retryDelayMs?: (attempt: number) => number;
  /** Current spend limits (task, agent, project, global). Checked before every model call. */
  loadBudgets?: () => Promise<BudgetLimit[]>;
}): Promise<RunOutcome> {
  const retryDelay = input.retryDelayMs ?? ((attempt: number) => Math.min(30_000, 1000 * 2 ** (attempt - 1)));
  const task = await input.store.loadTask(input.taskId);
  const agent = await input.store.loadAgent(task.tenantId, task.agentKey);
  if (!agent || !agent.enabled || agent.paused) {
    await input.store.setTaskStatus(task.id, "suspended");
    return { status: "suspended", reason: "The agent is disabled or paused." };
  }
  const permissions = await input.store.loadPermissions(task.tenantId, task.agentKey);
  const approved = new Set(input.approvedTools ?? []);
  let spent = task.spentPence;
  let attempts = task.attempts;
  let lastCallCost = 0;

  while (attempts < task.maxAttempts) {
    attempts += 1;
    await input.store.setTaskStatus(task.id, "running", { attempts, spentPence: spent });
    const runId = await input.store.startRun({ taskId: task.id, tenantId: task.tenantId, attempt: attempts, provider: input.provider.name, model: input.provider.model });
    const ctx: ToolContext = { tenantId: task.tenantId, projectId: task.projectId, taskId: task.id };
    const messages: ProviderMessage[] = [{ role: "user", content: task.title }];
    let inputTokens = 0;
    let outputTokens = 0;
    let costPence = 0;

    try {
      for (let call = 0; call < MAX_MODEL_CALLS_PER_ATTEMPT; call++) {
        if (spent >= task.budgetPence) {
          await input.store.finishRun(runId, { status: "stopped", inputTokens, outputTokens, costPence, error: "Task budget reached" });
          await input.store.setTaskStatus(task.id, "suspended", { spentPence: spent, attempts });
          return { status: "suspended", reason: "This task has reached its budget." };
        }
        // Every model call is checked against the agent, project and global limits as well. The estimate
        // uses the most expensive call seen so far, so a call that could exceed a limit is never started.
        if (input.loadBudgets) {
          // Stored totals only change when a run finishes, so add what this task has spent since it started.
          const runSpend = spent - task.spentPence;
          const limits = (await input.loadBudgets()).map((limit) => ({ ...limit, spentPence: limit.spentPence + runSpend }));
          const verdict = checkBudgets(limits, lastCallCost);
          if (verdict.outcome === "stop") {
            await input.store.finishRun(runId, { status: "stopped", inputTokens, outputTokens, costPence, error: verdict.reason });
            await input.store.setTaskStatus(task.id, "suspended", { spentPence: spent, attempts });
            return { status: "suspended", reason: verdict.reason };
          }
        }
        const response = await input.provider.complete({
          system: input.system,
          messages,
          tools: input.tools.list().map((t) => ({ name: t.name, description: t.description })),
        });
        inputTokens += response.usage.inputTokens;
        outputTokens += response.usage.outputTokens;
        costPence += response.usage.costPence;
        spent += response.usage.costPence;
        lastCallCost = Math.max(lastCallCost, response.usage.costPence);

        if (response.kind === "final") {
          await input.store.finishRun(runId, { status: "succeeded", inputTokens, outputTokens, costPence });
          await input.store.setTaskStatus(task.id, "succeeded", { spentPence: spent, attempts });
          return { status: "succeeded", text: response.text };
        }

        const tool = input.tools.get(response.tool);
        const decision = decideToolUse({
          agentKey: task.agentKey,
          agentEnabled: true,
          agentPaused: false,
          tool,
          permissions,
          approved: approved.has(response.tool),
        });
        if (decision.outcome !== "allow" || !tool) {
          const reason = decision.outcome === "allow" ? "Unknown tool" : decision.reason;
          await input.store.recordToolCall({ runId, tenantId: task.tenantId, tool: response.tool, allowed: false, denialReason: reason, args: response.args });
          if (decision.outcome === "needs_approval") {
            await input.store.finishRun(runId, { status: "stopped", inputTokens, outputTokens, costPence, error: reason });
            await input.store.setTaskStatus(task.id, "awaiting_approval", { spentPence: spent, attempts });
            return { status: "awaiting_approval", tool: response.tool, reason };
          }
          await input.store.finishRun(runId, { status: "failed", inputTokens, outputTokens, costPence, error: reason });
          await input.store.setTaskStatus(task.id, "failed", { spentPence: spent, attempts });
          return { status: "failed", reason };
        }

        const validation = tool.validate(response.args);
        if (validation) {
          messages.push({ role: "tool", toolName: tool.name, content: `Invalid arguments: ${validation}` });
          await input.store.recordToolCall({ runId, tenantId: task.tenantId, tool: tool.name, allowed: false, denialReason: validation, args: response.args });
          continue;
        }
        const result = await tool.run(response.args, ctx);
        await input.store.recordToolCall({ runId, tenantId: task.tenantId, tool: tool.name, allowed: true, args: response.args, resultSummary: result.slice(0, 1000) });
        messages.push({ role: "tool", toolName: tool.name, content: result });
      }
      // A runaway tool loop is not retried: fresh attempts would only spend more budget on the same loop.
      await input.store.finishRun(runId, { status: "failed", inputTokens, outputTokens, costPence, error: "Too many steps without a result" });
      await input.store.setTaskStatus(task.id, "failed", { spentPence: spent, attempts });
      return { status: "failed", reason: "The task took too many steps without a result." };
    } catch (error) {
      const providerError = error instanceof ProviderError ? error : null;
      const message = error instanceof Error ? error.message.slice(0, 500) : "Unknown error";
      await input.store.finishRun(runId, { status: "failed", inputTokens, outputTokens, costPence, error: message });
      if (providerError?.kind === "authentication" || providerError?.kind === "invalid_response") {
        await input.store.setTaskStatus(task.id, "failed", { spentPence: spent, attempts });
        return { status: "failed", reason: providerError.kind === "authentication" ? "The model provider rejected the credentials." : "The model returned an unusable response." };
      }
      // Transient errors (and unexpected ones) are retried after a delay, up to the attempt limit.
      if (attempts < task.maxAttempts) await sleep(retryDelay(attempts));
    }
  }
  await input.store.setTaskStatus(task.id, "failed", { spentPence: spent, attempts });
  return { status: "failed", reason: "The task did not complete within its retry limit." };
}

function sleep(ms: number): Promise<void> {
  return ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve();
}
