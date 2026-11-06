import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { RunStore } from "@/lib/ai/runner";

/**
 * Writes agent work to the database. Uses the server's secret key, because browser roles can't write these
 * tables (see migration 20261106270000). Every failure throws, so the runner records it rather than hiding it.
 */
export class SupabaseRunStore implements RunStore {
  constructor(private readonly db: SupabaseClient) {}

  async loadTask(taskId: string) {
    const { data, error } = await this.db
      .from("ai_tasks")
      .select("id, tenant_id, agent_key, project_id, title, status, attempts, max_attempts, budget_pence, spent_pence")
      .eq("id", taskId)
      .single();
    if (error || !data) throw new Error(`Could not load task: ${error?.message ?? "not found"}`);
    const row = data as Record<string, unknown>;
    return {
      id: String(row.id),
      tenantId: String(row.tenant_id),
      agentKey: String(row.agent_key),
      projectId: row.project_id ? String(row.project_id) : null,
      title: String(row.title),
      status: String(row.status),
      attempts: Number(row.attempts),
      maxAttempts: Number(row.max_attempts),
      budgetPence: Number(row.budget_pence),
      spentPence: Number(row.spent_pence),
    };
  }

  async loadAgent(tenantId: string, agentKey: string) {
    const { data, error } = await this.db
      .from("ai_agents")
      .select("enabled, paused")
      .eq("tenant_id", tenantId)
      .eq("agent_key", agentKey)
      .maybeSingle();
    if (error) throw new Error(`Could not load agent: ${error.message}`);
    if (!data) return null;
    const row = data as { enabled: boolean; paused: boolean };
    return { enabled: row.enabled, paused: row.paused };
  }

  async loadPermissions(tenantId: string, agentKey: string) {
    const { data, error } = await this.db
      .from("ai_permissions")
      .select("tool, allowed")
      .eq("tenant_id", tenantId)
      .eq("agent_key", agentKey);
    if (error) throw new Error(`Could not load permissions: ${error.message}`);
    const result: Record<string, boolean> = {};
    for (const row of (data ?? []) as Array<{ tool: string; allowed: boolean }>) result[row.tool] = row.allowed;
    return result;
  }

  async setTaskStatus(taskId: string, status: string, patch?: { attempts?: number; spentPence?: number }) {
    const update: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
    if (patch?.attempts !== undefined) update.attempts = patch.attempts;
    if (patch?.spentPence !== undefined) update.spent_pence = patch.spentPence;
    const { error } = await this.db.from("ai_tasks").update(update).eq("id", taskId);
    if (error) throw new Error(`Could not update task: ${error.message}`);
  }

  async startRun(input: { taskId: string; tenantId: string; attempt: number; provider: string; model: string }) {
    const { data, error } = await this.db
      .from("ai_runs")
      .insert({ task_id: input.taskId, tenant_id: input.tenantId, attempt: input.attempt, provider: input.provider, model: input.model })
      .select("id")
      .single();
    if (error || !data) throw new Error(`Could not start run: ${error?.message ?? "no id returned"}`);
    return String((data as { id: unknown }).id);
  }

  async finishRun(runId: string, input: { status: "succeeded" | "failed" | "stopped"; inputTokens: number; outputTokens: number; costPence: number; error?: string }) {
    const { error } = await this.db
      .from("ai_runs")
      .update({
        status: input.status,
        input_tokens: input.inputTokens,
        output_tokens: input.outputTokens,
        cost_pence: input.costPence,
        error: input.error ? input.error.slice(0, 1000) : null,
        finished_at: new Date().toISOString(),
      })
      .eq("id", runId);
    if (error) throw new Error(`Could not finish run: ${error.message}`);
  }

  async recordToolCall(input: { runId: string; tenantId: string; tool: string; allowed: boolean; denialReason?: string; args: Record<string, unknown>; resultSummary?: string }) {
    const { error } = await this.db.from("ai_tool_calls").insert({
      run_id: input.runId,
      tenant_id: input.tenantId,
      tool: input.tool.slice(0, 80),
      allowed: input.allowed,
      denial_reason: input.denialReason ? input.denialReason.slice(0, 300) : null,
      arguments: input.args,
      result_summary: input.resultSummary ? input.resultSummary.slice(0, 1000) : null,
    });
    if (error) throw new Error(`Could not record tool call: ${error.message}`);
  }
}
