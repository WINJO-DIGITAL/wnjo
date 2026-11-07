import { describe, expect, it } from "vitest";
import { dueDeadlines, DEADLINE_WINDOW_DAYS } from "@/lib/ai/deadlines";

const project = (id: string, targetDate: string, status = "in_progress") => ({ id, tenantId: "t", status, targetDate });

describe("dueDeadlines", () => {
  it("raises an event for an open project due within the window", () => {
    const due = dueDeadlines([project("p1", "2026-11-12")], "2026-11-07");
    expect(due).toEqual([{ projectId: "p1", tenantId: "t", dedupeKey: "deadline:p1:2026-11-12" }]);
  });

  it("includes a deadline due today and one at the edge of the window", () => {
    expect(dueDeadlines([project("p1", "2026-11-07")], "2026-11-07")).toHaveLength(1);
    const edge = new Date(Date.parse("2026-11-07T00:00:00Z") + DEADLINE_WINDOW_DAYS * 86_400_000).toISOString().slice(0, 10);
    expect(dueDeadlines([project("p1", edge)], "2026-11-07")).toHaveLength(1);
  });

  it("ignores deadlines that are past or further away than the window", () => {
    expect(dueDeadlines([project("p1", "2026-11-06")], "2026-11-07")).toEqual([]);
    expect(dueDeadlines([project("p1", "2026-11-20")], "2026-11-07")).toEqual([]);
  });

  it("ignores projects that are finished, on hold or archived", () => {
    expect(dueDeadlines([project("p1", "2026-11-09", "completed")], "2026-11-07")).toEqual([]);
    expect(dueDeadlines([project("p1", "2026-11-09", "on_hold")], "2026-11-07")).toEqual([]);
  });
});
