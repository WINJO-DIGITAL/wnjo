import { describe, expect, it } from "vitest";
import { goodShare, summariseRatings } from "./ratings";

describe("summariseRatings", () => {
  it("counts good and needs-work ratings per template, and ignores anything else", () => {
    const s = summariseRatings([
      { template: "barber", rating: "good" },
      { template: "barber", rating: "needs_work" },
      { template: "barber", rating: "good" },
      { template: "cafe", rating: "needs_work" },
      { template: "cafe", rating: "maybe" },
    ]);
    expect(s).toEqual([
      { template: "barber", good: 2, needsWork: 1 },
      { template: "cafe", good: 0, needsWork: 1 },
    ]);
  });
  it("gives the share rated good, and nothing when nothing is rated", () => {
    expect(goodShare({ template: "barber", good: 3, needsWork: 1 })).toBe(0.75);
    expect(goodShare({ template: "barber", good: 0, needsWork: 0 })).toBeNull();
  });
});
