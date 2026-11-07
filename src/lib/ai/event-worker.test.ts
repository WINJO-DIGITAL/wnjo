import { describe, expect, it } from "vitest";
import { handleEvent, type TaskQueue } from "@/lib/ai/event-worker";
import type { PlannedTask } from "@/lib/ai/events";
import type { RunOutcome } from "@/lib/ai/runner";

/** An in-memory queue that honours the dedupe key, the same way the database's unique index does. */
function memoryQueue() {
  const byKey = new Map<string, string>();
  let next = 0;
  const queue: TaskQueue = {
    async enqueue(tenantId: string, task: PlannedTask) {
      const key = `${tenantId}:${task.dedupeKey}`;
      const existing = byKey.get(key);
      if (existing) return { taskId: existing, created: false };
      next += 1;
      byKey.set(key, `task-${next}`);
      return { taskId: `task-${next}`, created: true };
    },
  };
  return { queue, size: () => byKey.size };
}

const event = { id: "evt-1", tenantId: "t1", projectId: "p1", type: "deposit_paid" as const };

describe("handleEvent", () => {
  it("queues and runs the planned task for a new event", async () => {
    const { queue } = memoryQueue();
    const ran: string[] = [];
    const results = await handleEvent(event, {
      queue,
      runQueuedTask: async (id) => {
        ran.push(id);
        return { status: "succeeded", text: "planned" };
      },
    });
    expect(results).toHaveLength(1);
    expect(results[0].agentKey).toBe("project_manager");
    expect(results[0].outcome).toEqual({ status: "succeeded", text: "planned" });
    expect(ran).toEqual([results[0].taskId]);
  });

  it("does not run work again when the same event is delivered twice", async () => {
    const { queue, size } = memoryQueue();
    let runs = 0;
    const run = async (): Promise<RunOutcome> => {
      runs += 1;
      return { status: "succeeded", text: "ok" };
    };
    await handleEvent(event, { queue, runQueuedTask: run });
    const second = await handleEvent(event, { queue, runQueuedTask: run });
    expect(runs).toBe(1);
    expect(size()).toBe(1);
    expect(second[0].created).toBe(false);
    expect(second[0].outcome).toBeUndefined();
  });

  it("keeps a task waiting for approval as that outcome, not as a failure", async () => {
    const { queue } = memoryQueue();
    const results = await handleEvent(event, {
      queue,
      runQueuedTask: async () => ({ status: "awaiting_approval", tool: "change_scope", reason: "needs approval" }),
    });
    expect(results[0].outcome).toEqual({ status: "awaiting_approval", tool: "change_scope", reason: "needs approval" });
  });

  it("keeps a run error against its queued task instead of losing it", async () => {
    const { queue } = memoryQueue();
    const results = await handleEvent(event, {
      queue,
      runQueuedTask: async () => {
        throw new Error("provider exploded");
      },
    });
    expect(results[0].created).toBe(true);
    expect(results[0].taskId).not.toBeNull();
    expect(results[0].error).toBe("provider exploded");
    expect(results[0].outcome).toBeUndefined();
  });

  it("records a queue failure for that task and carries on", async () => {
    const failing: TaskQueue = {
      async enqueue() {
        throw new Error("database down");
      },
    };
    const results = await handleEvent(event, { queue: failing, runQueuedTask: async () => ({ status: "succeeded", text: "" }) });
    expect(results[0].error).toBe("database down");
    expect(results[0].created).toBe(false);
  });

  it("never re-triggers the agent that caused the event", async () => {
    const { queue } = memoryQueue();
    const results = await handleEvent(
      { ...event, type: "task_completed", sourceAgent: "project_manager" },
      { queue, runQueuedTask: async () => ({ status: "succeeded", text: "" }) },
    );
    expect(results).toEqual([]);
  });
});
