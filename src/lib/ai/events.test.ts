import { describe, expect, it } from "vitest";
import { EVENT_TYPES, planTasksForEvent, type AgentEvent } from "@/lib/ai/events";

const base = { id: "evt-1", tenantId: "t", projectId: "p" };

describe("event routing", () => {
  it("routes a paid deposit to the project manager", () => {
    const tasks = planTasksForEvent({ ...base, type: "deposit_paid" });
    expect(tasks.map((t) => t.agentKey)).toEqual(["project_manager"]);
    expect(tasks[0].projectId).toBe("p");
  });

  it("gives the same key to a repeated delivery of the same event", () => {
    const first = planTasksForEvent({ ...base, type: "qa_failed" });
    const second = planTasksForEvent({ ...base, type: "qa_failed" });
    expect(first[0].dedupeKey).toBe(second[0].dedupeKey);
  });

  it("gives different keys to different events of the same type", () => {
    const a = planTasksForEvent({ ...base, id: "a", type: "client_message_received" });
    const b = planTasksForEvent({ ...base, id: "b", type: "client_message_received" });
    expect(a[0].dedupeKey).not.toBe(b[0].dedupeKey);
  });

  it("never re-triggers the agent that caused the event", () => {
    const event: AgentEvent = { ...base, type: "task_completed", sourceAgent: "project_manager" };
    expect(planTasksForEvent(event)).toEqual([]);
  });

  it("refuses an unknown event type rather than guessing", () => {
    expect(() => planTasksForEvent({ ...base, type: "made_up" as never })).toThrow(/Unknown event type/);
  });

  it("routes every known event type to at least one agent", () => {
    for (const type of EVENT_TYPES) {
      expect(planTasksForEvent({ ...base, type }).length).toBeGreaterThan(0);
    }
  });
});
