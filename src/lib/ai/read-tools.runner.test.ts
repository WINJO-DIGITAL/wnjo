import { describe, expect, it } from "vitest";
import { buildReadToolRegistry } from "@/lib/ai/read-tools";
import type { AiProvider, ProviderResponse } from "@/lib/ai/provider";
import { runTask, type RunStore } from "@/lib/ai/runner";
import type { SupabaseClient } from "@supabase/supabase-js";

const usage = { inputTokens: 10, outputTokens: 5, costPence: 1 };

/** A provider that plays back a script of responses. */
function scripted(steps: ProviderResponse[]): AiProvider {
  let i = 0;
  return {
    name: "fake",
    model: "fake-model",
    async complete() {
      const step = steps[Math.min(i, steps.length - 1)];
      i++;
      return step;
    },
  };
}

/** A fake database: every query resolves to the same rows, and each table touched is recorded. */
function fakeDb(touched: string[]) {
  const rows: Record<string, unknown[]> = {
    enquiries: [{ reference: "WNJO-A1", topic: "website", budget: "2000", timeline: "1-3 months", created_at: "2026-11-06T10:00:00Z" }],
    orders: [{ business_name: "Harbour Coffee", project_type: "business", stage: "designing", stage_updated_at: "2026-11-05T09:00:00Z" }],
    quotes: [],
    deposits: [{ amount_pence: 90000 }],
    approval_requests: [],
  };
  const builder = (table: string) => {
    touched.push(table);
    const result = { data: rows[table] ?? [], error: null, count: (rows[table] ?? []).length };
    const chain: Record<string, unknown> = {};
    for (const m of ["select", "eq", "neq", "gte", "lte", "order", "limit", "in"]) chain[m] = () => chain;
    chain.then = (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve);
    return chain;
  };
  return { from: (table: string) => builder(table) } as unknown as SupabaseClient;
}

/** An in-memory run store: one queued task, with the permissions and the calls it records. */
function memoryStore(permissions: Record<string, boolean>) {
  const task = { id: "t1", tenantId: "tenant", agentKey: "business_manager", projectId: null, title: "Report", status: "queued", attempts: 0, maxAttempts: 3, budgetPence: 500, spentPence: 0 };
  const calls: Array<{ tool: string; allowed: boolean; denialReason?: string }> = [];
  const store: RunStore = {
    async loadTask() {
      return { ...task };
    },
    async loadAgent() {
      return { enabled: true, paused: false };
    },
    async loadPermissions() {
      return permissions;
    },
    async setTaskStatus(_id, status) {
      task.status = status;
    },
    async startRun() {
      return "run-1";
    },
    async finishRun() {},
    async recordToolCall(input) {
      calls.push({ tool: input.tool, allowed: input.allowed, denialReason: input.denialReason });
    },
  };
  return { store, calls };
}

describe("tier 1 read tools through the agent runner", () => {
  it("lets a permitted agent read the business summary and records the call", async () => {
    const touched: string[] = [];
    const { store, calls } = memoryStore({ business_summary: true });
    const provider = scripted([{ kind: "tool_call", tool: "business_summary", args: {}, usage }, { kind: "final", text: "Summarised", usage }]);
    const outcome = await runTask({ taskId: "t1", provider, tools: buildReadToolRegistry(fakeDb(touched)), store, system: "sys", retryDelayMs: () => 0 });
    expect(outcome.status).toBe("succeeded");
    expect(calls).toEqual([{ tool: "business_summary", allowed: true, denialReason: undefined }]);
    expect(touched.length).toBeGreaterThan(0);
  });

  it("refuses a read tool the agent is not permitted to use, and never queries that data", async () => {
    const touched: string[] = [];
    const { store, calls } = memoryStore({ business_summary: true });
    const provider = scripted([{ kind: "tool_call", tool: "list_recent_enquiries", args: {}, usage }, { kind: "final", text: "Done", usage }]);
    await runTask({ taskId: "t1", provider, tools: buildReadToolRegistry(fakeDb(touched)), store, system: "sys", retryDelayMs: () => 0 });
    expect(calls[0]).toMatchObject({ tool: "list_recent_enquiries", allowed: false });
    expect(touched).not.toContain("enquiries");
  });

  it("refuses a tool that does not exist", async () => {
    const touched: string[] = [];
    const { store, calls } = memoryStore({});
    const provider = scripted([{ kind: "tool_call", tool: "delete_everything", args: {}, usage }, { kind: "final", text: "Done", usage }]);
    await runTask({ taskId: "t1", provider, tools: buildReadToolRegistry(fakeDb(touched)), store, system: "sys", retryDelayMs: () => 0 });
    expect(calls[0]).toMatchObject({ tool: "delete_everything", allowed: false });
    expect(touched).toEqual([]);
  });
});
