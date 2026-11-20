import { describe, expect, it } from "vitest";
import { CATEGORIES, CATEGORY_IDS, categoryById, OTHER_CATEGORY } from "./business-categories";

describe("the business categories", () => {
  it("are exactly ten, plus something else, each with a different id and label", () => {
    expect(CATEGORIES).toHaveLength(10);
    expect(new Set(CATEGORIES.map((c) => c.id)).size).toBe(10);
    expect(new Set(CATEGORIES.map((c) => c.label)).size).toBe(10);
    expect(CATEGORY_IDS).toContain(OTHER_CATEGORY);
  });

  it("each ask two or three questions of their own, with a hint and no numbering or question marks missing", () => {
    for (const c of CATEGORIES) {
      expect(c.questions.length, c.id).toBeGreaterThanOrEqual(2);
      expect(c.questions.length, c.id).toBeLessThanOrEqual(3);
      for (const q of c.questions) {
        expect(q.label.endsWith("?"), q.label).toBe(true);
        expect(q.hint.length, q.id).toBeGreaterThan(10);
      }
    }
  });

  it("cover the industries the statistics point to, with no category named after one trade", () => {
    const labels = CATEGORIES.map((c) => c.label.toLowerCase());
    for (const word of ["trades", "professional", "retail", "health", "education", "transport", "fitness", "food", "property", "charit"]) {
      expect(labels.some((l) => l.includes(word)), word).toBe(true);
    }
    expect(labels.some((l) => /plumb|electric|barber|cafe|café/.test(l))).toBe(false);
  });

  it("can be looked up by id", () => {
    expect(categoryById("trades")?.label).toBe("Trades and home services");
    expect(categoryById("nope")).toBeNull();
  });
});
