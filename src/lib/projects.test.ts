import { describe, expect, it } from "vitest";
import { OWNER_QUOTES } from "@/lib/projects";

describe("OWNER_QUOTES", () => {
  it("shows each pull-quote word for word from the owner's approved quote", () => {
    for (const { project, quote, pull } of OWNER_QUOTES) {
      expect(quote, project.name).toContain(pull);
    }
  });

  it("keeps each pull-quote to a single short sentence", () => {
    for (const { pull } of OWNER_QUOTES) {
      expect(pull.length).toBeLessThanOrEqual(90);
      expect(pull.trim().endsWith(".")).toBe(true);
    }
  });
});
