import { describe, expect, it } from "vitest";
import { checkBudgets } from "@/lib/ai/budget";

const limit = (scope: "global" | "agent" | "project" | "task", limitPence: number, spentPence: number, warnAtPence = limitPence) =>
  ({ scope, limitPence, warnAtPence, spentPence });

describe("budget gate", () => {
  it("allows a call that keeps every limit intact", () => {
    expect(checkBudgets([limit("global", 10000, 100), limit("task", 500, 10)], 5)).toEqual({ outcome: "allow", warnings: [] });
  });

  it("stops at the first limit that would be exceeded, naming it", () => {
    const verdict = checkBudgets([limit("global", 10000, 100), limit("project", 300, 298)], 5);
    expect(verdict).toMatchObject({ outcome: "stop", limitingScope: "project" });
  });

  it("stops a call that would exactly cross the limit, but allows one that lands on it", () => {
    expect(checkBudgets([limit("task", 100, 95)], 5).outcome).toBe("allow");
    expect(checkBudgets([limit("task", 100, 95)], 6).outcome).toBe("stop");
  });

  it("warns when a limit reaches its warning threshold but still allows the call", () => {
    const verdict = checkBudgets([limit("agent", 1000, 780, 800)], 30);
    expect(verdict.outcome).toBe("allow");
    expect(verdict.outcome === "allow" && verdict.warnings.length).toBe(1);
  });
});
