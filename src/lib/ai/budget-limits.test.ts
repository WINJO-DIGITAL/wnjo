import { describe, expect, it } from "vitest";
import { buildBudgetLimits, type BudgetSetting, type MonthlySpend } from "@/lib/ai/budget-limits";

const spend: MonthlySpend = { total: 3000, byAgent: { developer: 1200 }, byProject: { p1: 800 } };
const task = { id: "t1", budgetPence: 500, spentPence: 100 };

describe("buildBudgetLimits", () => {
  it("fails closed when there is no global setting", () => {
    const limits = buildBudgetLimits({ settings: [], spend, agentKey: "developer", projectId: null, task });
    const global = limits.find((l) => l.scope === "global");
    expect(global).toEqual({ scope: "global", limitPence: 0, warnAtPence: 0, spentPence: 3000 });
  });

  it("adds agent and project limits with this month's spend for each", () => {
    const settings: BudgetSetting[] = [
      { scope: "global", scope_id: null, monthly_limit_pence: 10000, warn_at_pence: 8000 },
      { scope: "agent", scope_id: "developer", monthly_limit_pence: 2000, warn_at_pence: 1500 },
      { scope: "project", scope_id: "p1", monthly_limit_pence: 1000, warn_at_pence: 900 },
    ];
    const limits = buildBudgetLimits({ settings, spend, agentKey: "developer", projectId: "p1", task });
    expect(limits.find((l) => l.scope === "agent")).toEqual({ scope: "agent", limitPence: 2000, warnAtPence: 1500, spentPence: 1200 });
    expect(limits.find((l) => l.scope === "project")).toEqual({ scope: "project", limitPence: 1000, warnAtPence: 900, spentPence: 800 });
  });

  it("gives the task its own limit, warning at 80 percent", () => {
    const limits = buildBudgetLimits({ settings: [], spend, agentKey: "developer", projectId: null, task });
    expect(limits.find((l) => l.scope === "task")).toEqual({ scope: "task", limitPence: 500, warnAtPence: 400, spentPence: 100 });
  });

  it("applies no agent or project limit when none is set", () => {
    const limits = buildBudgetLimits({ settings: [], spend, agentKey: "qa_engineer", projectId: null, task });
    expect(limits.map((l) => l.scope)).toEqual(["global", "task"]);
  });
});
