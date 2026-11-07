import { describe, expect, it } from "vitest";
import { processEvents, type EventMark, type QueuedEvent } from "@/lib/ai/event-processor";
import type { TaskQueue } from "@/lib/ai/event-worker";

function fakes(options: { runError?: string; queueError?: string } = {}) {
  const tasks = new Map<string, string>();
  const runs: string[] = [];
  const marks: Array<{ id: string; mark: EventMark }> = [];
  const queue: TaskQueue = {
    async enqueue(tenantId, task) {
      if (options.queueError) throw new Error(options.queueError);
      const key = `${tenantId}:${task.dedupeKey}`;
      const existing = tasks.get(key);
      if (existing) return { taskId: existing, created: false };
      const id = `task-${tasks.size + 1}`;
      tasks.set(key, id);
      return { taskId: id, created: true };
    },
  };
  return {
    tasks,
    runs,
    marks,
    deps: {
      queue,
      runQueuedTask: async (taskId: string): Promise<import("@/lib/ai/runner").RunOutcome> => {
        runs.push(taskId);
        if (options.runError) throw new Error(options.runError);
        return { status: "suspended", reason: "The agent is disabled or paused." };
      },
      markEvent: async (id: string, mark: EventMark) => {
        marks.push({ id, mark });
      },
    },
  };
}

const deposit: QueuedEvent = { id: "e1", tenantId: "t1", type: "deposit_paid", projectId: null };

describe("processEvents", () => {
  it("marks an event processed once its tasks were queued and ran", async () => {
    const f = fakes();
    const result = await processEvents([deposit], f.deps);
    expect(result).toEqual({ processed: 1, failed: 0 });
    expect(f.runs).toHaveLength(1);
    expect(f.marks).toEqual([{ id: "e1", mark: { status: "processed" } }]);
  });

  it("marks the event failed, with the error, when a task run throws", async () => {
    const f = fakes({ runError: "provider exploded" });
    const result = await processEvents([deposit], f.deps);
    expect(result).toEqual({ processed: 0, failed: 1 });
    expect(f.marks[0].mark).toEqual({ status: "failed", error: "provider exploded" });
  });

  it("marks the event failed when a task cannot be queued", async () => {
    const f = fakes({ queueError: "database down" });
    await processEvents([deposit], f.deps);
    expect(f.marks[0].mark).toEqual({ status: "failed", error: "database down" });
  });

  it("marks an event with an unknown type failed rather than stopping the batch", async () => {
    const f = fakes();
    const events: QueuedEvent[] = [{ id: "bad", tenantId: "t1", type: "made_up" as never, projectId: null }, deposit];
    const result = await processEvents(events, f.deps);
    expect(result).toEqual({ processed: 1, failed: 1 });
    expect(f.marks[0].mark.status).toBe("failed");
    expect(f.marks[1].mark.status).toBe("processed");
  });

  it("does not run the same work twice when the event is processed again", async () => {
    const f = fakes();
    await processEvents([deposit], f.deps);
    await processEvents([deposit], f.deps);
    expect(f.runs).toHaveLength(1);
  });
});
