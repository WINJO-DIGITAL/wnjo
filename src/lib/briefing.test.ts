import { describe, expect, it } from "vitest";
import { buildBriefing, londonOffsetMinutes, londonTimeToUtc, nextBriefingAt, londonDay, type BriefingFacts } from "@/lib/briefing";

const empty: BriefingFacts = {
  activeProjects: 0,
  overdueMilestones: [],
  upcomingDeliveries: [],
  pendingApprovals: [],
  openRevisions: 0,
  unansweredClientMessages: [],
  newEnquiriesLast24h: 0,
  failedAiTasks: 0,
  aiSpendThisMonthPence: 0,
};

describe("London time", () => {
  it("uses GMT in winter and BST in summer", () => {
    expect(londonOffsetMinutes(new Date("2026-01-15T12:00:00Z"))).toBe(0);
    expect(londonOffsetMinutes(new Date("2026-07-01T12:00:00Z"))).toBe(60);
  });

  it("puts 07:30 London at the right UTC time in winter and summer", () => {
    expect(londonTimeToUtc(2026, 1, 15, 7, 30).toISOString()).toBe("2026-01-15T07:30:00.000Z");
    expect(londonTimeToUtc(2026, 7, 1, 7, 30).toISOString()).toBe("2026-07-01T06:30:00.000Z");
  });

  it("schedules the next 07:30 before and after it has passed, across the clock change", () => {
    // Before 07:30 on 2026-03-29 (the clocks go forward that morning) in winter time.
    expect(nextBriefingAt(new Date("2026-03-28T20:00:00Z")).toISOString()).toBe("2026-03-29T06:30:00.000Z");
    // After today's 07:30 in summer time: the next one is tomorrow.
    expect(nextBriefingAt(new Date("2026-07-01T07:00:00Z")).toISOString()).toBe("2026-07-02T06:30:00.000Z");
    // Exactly at 07:30 BST counts as passed.
    expect(nextBriefingAt(new Date("2026-07-01T06:30:00Z")).toISOString()).toBe("2026-07-02T06:30:00.000Z");
  });
});

describe("briefing", () => {
  it("reports facts for an empty agency without inventing activity", () => {
    const b = buildBriefing(empty, "2026-11-07");
    expect(b.facts.find((f) => f.text.startsWith("0 active project"))).toBeTruthy();
    expect(b.recommendations).toEqual([]);
  });

  it("keeps facts and recommendations separate, and links items to their project", () => {
    const b = buildBriefing(
      {
        ...empty,
        activeProjects: 2,
        overdueMilestones: [{ projectName: "RAENG", title: "Homepage build", dueOn: "2026-11-01" }],
        pendingApprovals: [{ projectName: "EV Exec", title: "Design", openSince: "2026-11-03" }],
        unansweredClientMessages: [{ projectName: "Boonma", waitingSince: "2026-11-05" }],
        failedAiTasks: 1,
      },
      "2026-11-07",
    );
    expect(b.recommendations.length).toBe(4);
    expect(b.recommendations.every((r) => r.text.length > 0)).toBe(true);
    expect(b.facts.some((f) => f.project === "RAENG")).toBe(true);
    // A recommendation never appears in the facts list.
    expect(b.facts.some((f) => f.text.startsWith("Reply to the client"))).toBe(false);
  });

  it("states the AI spend in pounds", () => {
    const b = buildBriefing({ ...empty, aiSpendThisMonthPence: 1234 }, "2026-11-07");
    expect(b.facts.some((f) => f.text === "AI spend this month: £12.34.")).toBe(true);
  });
});

describe("londonDay", () => {
  it("uses the London date, not UTC, so an agency gets one briefing per local day", () => {
    // 23:30 UTC in June is already the next day in London (BST, UTC+1).
    expect(londonDay(new Date("2026-06-01T23:30:00Z"))).toBe("2026-06-02");
    // 23:30 UTC in November is still the same day in London (GMT).
    expect(londonDay(new Date("2026-11-07T23:30:00Z"))).toBe("2026-11-07");
  });
});
