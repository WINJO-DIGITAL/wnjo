import { describe, expect, it } from "vitest";
import { ProviderError, type AiProvider, type ProviderResponse } from "@/lib/ai/provider";
import { ToolRegistry, type ToolDefinition } from "@/lib/ai/tools";
import { budgetRemaining, canSpend, decideToolUse } from "@/lib/ai/policy";
import { MAX_MODEL_CALLS_PER_ATTEMPT, runTask, type RunStore } from "@/lib/ai/runner";

const usage = { inputTokens: 10, outputTokens: 5, costPence: 1 };

/** A provider that plays back a script of responses or errors, and counts calls. */
function scripted(steps: Array<ProviderResponse | Error>): AiProvider & { calls: number } {
  let i = 0;
  const provider = {
    name: "fake",
    model: "fake-model",
    calls: 0,
    async complete() {
      provider.calls++;
      const step = steps[Math.min(i, steps.length - 1)];
      i++;
      if (step instanceof Error) throw step;
      return step;
    },
  };
  return provider;
}

/** Repeats one response forever, to test that loops are bounded. */
function forever(response: ProviderResponse): AiProvider & { calls: number } {
  return scripted([response]);
}

type Row = { id: string; tenantId: string; agentKey: string; projectId: string | null; title: string; status: string; attempts: number; maxAttempts: number; budgetPence: number; spentPence: number };

/** An in-memory store that records everything the engine writes. */
function memoryStore(opts: { agent?: { enabled: boolean; paused: boolean } | null; permissions?: Record<string, boolean>; budgetPence?: number; maxAttempts?: number }) {
  const task: Row = { id: "t1", tenantId: "tenant", agentKey: "developer", projectId: "p1", title: "Fix the homepage", status: "queued", attempts: 0, maxAttempts: opts.maxAttempts ?? 3, budgetPence: opts.budgetPence ?? 500, spentPence: 0 };
  const log = { statuses: [] as string[], runs: [] as Array<{ status: string; error?: string; costPence: number }>, calls: [] as Array<{ tool: string; allowed: boolean; denialReason?: string }>, runCount: 0 };
  const store: RunStore = {
    async loadTask() {
      return { ...task };
    },
    async loadAgent() {
      return opts.agent === undefined ? { enabled: true, paused: false } : opts.agent;
    },
    async loadPermissions() {
      return opts.permissions ?? {};
    },
    async setTaskStatus(_id, status, patch) {
      task.status = status;
      if (patch?.attempts !== undefined) task.attempts = patch.attempts;
      if (patch?.spentPence !== undefined) task.spentPence = patch.spentPence;
      log.statuses.push(status);
    },
    async startRun() {
      log.runCount++;
      return `run-${log.runCount}`;
    },
    async finishRun(_id, input) {
      log.runs.push({ status: input.status, error: input.error, costPence: input.costPence });
    },
    async recordToolCall(input) {
      log.calls.push({ tool: input.tool, allowed: input.allowed, denialReason: input.denialReason });
    },
  };
  return { store, task, log };
}

const readTool: ToolDefinition = {
  name: "read_project",
  description: "Read the project record",
  highRisk: false,
  validate: () => null,
  run: async () => "Project: Homepage, status In build",
};
const priceTool: ToolDefinition = {
  name: "change_quote_price",
  description: "Change a quoted price",
  highRisk: true,
  validate: () => null,
  run: async () => "Price changed",
};
const registry = () => {
  const r = new ToolRegistry();
  r.register(readTool);
  r.register(priceTool);
  return r;
};

describe("tool registry and policy", () => {
  it("rejects duplicate tool names", () => {
    const r = new ToolRegistry();
    r.register(readTool);
    expect(() => r.register(readTool)).toThrow(/already registered/);
  });

  it("denies everything not explicitly permitted", () => {
    const decision = decideToolUse({ agentKey: "developer", agentEnabled: true, agentPaused: false, tool: readTool, permissions: {}, approved: false });
    expect(decision.outcome).toBe("deny");
  });

  it("denies disabled and paused agents regardless of permissions", () => {
    const base = { agentKey: "developer", tool: readTool, permissions: { read_project: true }, approved: false };
    expect(decideToolUse({ ...base, agentEnabled: false, agentPaused: false }).outcome).toBe("deny");
    expect(decideToolUse({ ...base, agentEnabled: true, agentPaused: true }).outcome).toBe("deny");
  });

  it("requires approval for high-risk tools even when permitted", () => {
    const base = { agentKey: "developer", agentEnabled: true, agentPaused: false, tool: priceTool, permissions: { change_quote_price: true } };
    expect(decideToolUse({ ...base, approved: false }).outcome).toBe("needs_approval");
    expect(decideToolUse({ ...base, approved: true }).outcome).toBe("allow");
  });

  it("tracks budget remaining and refuses spend beyond the limit", () => {
    expect(budgetRemaining({ limitPence: 100, spentPence: 40 })).toBe(60);
    expect(budgetRemaining({ limitPence: 100, spentPence: 140 })).toBe(0);
    expect(canSpend({ limitPence: 100, spentPence: 90 }, 10)).toBe(true);
    expect(canSpend({ limitPence: 100, spentPence: 90 }, 11)).toBe(false);
  });
});

describe("agent task runner", () => {
  it("completes a task with a final answer", async () => {
    const { store, log } = memoryStore({ permissions: {} });
    const outcome = await runTask({ taskId: "t1", provider: scripted([{ kind: "final", text: "Done", usage }]), tools: registry(), store, system: "sys" });
    expect(outcome).toEqual({ status: "succeeded", text: "Done" });
    expect(log.statuses.at(-1)).toBe("succeeded");
  });

  it("runs a permitted tool and records the call", async () => {
    const { store, log } = memoryStore({ permissions: { read_project: true } });
    const provider = scripted([{ kind: "tool_call", tool: "read_project", args: {}, usage }, { kind: "final", text: "Looks good", usage }]);
    const outcome = await runTask({ taskId: "t1", provider, tools: registry(), store, system: "sys" });
    expect(outcome.status).toBe("succeeded");
    expect(log.calls).toEqual([{ tool: "read_project", allowed: true, denialReason: undefined }]);
  });

  it("refuses a tool the agent is not permitted to use, and records the refusal", async () => {
    const { store, log } = memoryStore({ permissions: {} });
    const provider = scripted([{ kind: "tool_call", tool: "read_project", args: {}, usage }]);
    const outcome = await runTask({ taskId: "t1", provider, tools: registry(), store, system: "sys" });
    expect(outcome.status).toBe("failed");
    expect(log.calls[0]).toMatchObject({ tool: "read_project", allowed: false });
  });

  it("stops at a high-risk tool until an owner approves it, and never runs it unapproved", async () => {
    let ran = false;
    const r = new ToolRegistry();
    r.register({ ...priceTool, run: async () => { ran = true; return "changed"; } });
    const provider = scripted([{ kind: "tool_call", tool: "change_quote_price", args: {}, usage }, { kind: "final", text: "ok", usage }]);

    const blocked = memoryStore({ permissions: { change_quote_price: true } });
    const first = await runTask({ taskId: "t1", provider, tools: r, store: blocked.store, system: "sys" });
    expect(first).toMatchObject({ status: "awaiting_approval", tool: "change_quote_price" });
    expect(ran).toBe(false);
    expect(blocked.task.status).toBe("awaiting_approval");

    const approved = memoryStore({ permissions: { change_quote_price: true } });
    const provider2 = scripted([{ kind: "tool_call", tool: "change_quote_price", args: {}, usage }, { kind: "final", text: "ok", usage }]);
    const second = await runTask({ taskId: "t1", provider: provider2, tools: r, store: approved.store, system: "sys", approvedTools: ["change_quote_price"] });
    expect(second.status).toBe("succeeded");
    expect(ran).toBe(true);
  });

  it("does nothing for a paused agent, and never calls the model", async () => {
    const { store } = memoryStore({ agent: { enabled: true, paused: true }, permissions: { read_project: true } });
    const provider = scripted([{ kind: "final", text: "x", usage }]);
    const outcome = await runTask({ taskId: "t1", provider, tools: registry(), store, system: "sys" });
    expect(outcome.status).toBe("suspended");
    expect(provider.calls).toBe(0);
  });

  it("suspends a task at its budget, and records the stopped run", async () => {
    const { store, log } = memoryStore({ budgetPence: 2, permissions: { read_project: true } });
    const provider = forever({ kind: "tool_call", tool: "read_project", args: {}, usage: { inputTokens: 1, outputTokens: 1, costPence: 1 } });
    const outcome = await runTask({ taskId: "t1", provider, tools: registry(), store, system: "sys" });
    expect(outcome.status).toBe("suspended");
    expect(log.statuses.at(-1)).toBe("suspended");
    expect(provider.calls).toBeLessThanOrEqual(3);
  });

  it("retries transient provider errors, then succeeds", async () => {
    const { store, task } = memoryStore({ maxAttempts: 3 });
    const provider = scripted([new ProviderError("timeout", "transient"), { kind: "final", text: "Recovered", usage }]);
    const outcome = await runTask({ taskId: "t1", provider, tools: registry(), store, system: "sys" });
    expect(outcome).toEqual({ status: "succeeded", text: "Recovered" });
    expect(task.attempts).toBe(2);
  });

  it("does not retry an authentication failure", async () => {
    const { store, task } = memoryStore({ maxAttempts: 3 });
    const provider = scripted([new ProviderError("401", "authentication")]);
    const outcome = await runTask({ taskId: "t1", provider, tools: registry(), store, system: "sys" });
    expect(outcome.status).toBe("failed");
    expect(provider.calls).toBe(1);
    expect(task.attempts).toBe(1);
  });

  it("stops after the retry limit when errors keep happening", async () => {
    const { store, task } = memoryStore({ maxAttempts: 3 });
    const provider = scripted([new ProviderError("down", "transient")]);
    const outcome = await runTask({ taskId: "t1", provider, tools: registry(), store, system: "sys" });
    expect(outcome.status).toBe("failed");
    expect(provider.calls).toBe(3);
    expect(task.attempts).toBe(3);
  });

  it("bounds an endless tool loop and does not retry it", async () => {
    const { store, task } = memoryStore({ maxAttempts: 3, budgetPence: 1_000_000, permissions: { read_project: true } });
    const provider = forever({ kind: "tool_call", tool: "read_project", args: {}, usage: { inputTokens: 0, outputTokens: 0, costPence: 0 } });
    const outcome = await runTask({ taskId: "t1", provider, tools: registry(), store, system: "sys" });
    expect(outcome).toMatchObject({ status: "failed", reason: expect.stringContaining("too many steps") });
    expect(provider.calls).toBe(MAX_MODEL_CALLS_PER_ATTEMPT);
    expect(task.attempts).toBe(1);
    expect(task.status).toBe("failed");
  });
});
