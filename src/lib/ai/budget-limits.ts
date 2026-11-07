import type { BudgetLimit } from "@/lib/ai/budget";

/** A monthly budget row as stored in ai_budget_settings. */
export type BudgetSetting = {
  scope: "global" | "agent" | "project";
  scope_id: string | null;
  monthly_limit_pence: number;
  warn_at_pence: number;
};

/** One task's spend, from ai_tasks, with the month's totals already summed by the loader. */
export type MonthlySpend = {
  total: number;
  byAgent: Record<string, number>;
  byProject: Record<string, number>;
};

/**
 * Turns stored budget settings and this month's spend into the limits the runner checks before each model
 * call. Fails closed: with no global setting, nothing is allowed to spend. A task's own budget applies to
 * that task alone; an agent or project without a setting has no limit of its own.
 */
export function buildBudgetLimits(args: {
  settings: BudgetSetting[];
  spend: MonthlySpend;
  agentKey: string;
  projectId: string | null;
  task: { id: string; budgetPence: number; spentPence: number };
}): BudgetLimit[] {
  const { settings, spend, agentKey, projectId, task } = args;
  const limits: BudgetLimit[] = [];

  const global = settings.find((s) => s.scope === "global");
  limits.push({
    scope: "global",
    limitPence: global?.monthly_limit_pence ?? 0,
    warnAtPence: global?.warn_at_pence ?? 0,
    spentPence: spend.total,
  });

  const agent = settings.find((s) => s.scope === "agent" && s.scope_id === agentKey);
  if (agent) {
    limits.push({
      scope: "agent",
      limitPence: agent.monthly_limit_pence,
      warnAtPence: agent.warn_at_pence,
      spentPence: spend.byAgent[agentKey] ?? 0,
    });
  }

  if (projectId) {
    const project = settings.find((s) => s.scope === "project" && s.scope_id === projectId);
    if (project) {
      limits.push({
        scope: "project",
        limitPence: project.monthly_limit_pence,
        warnAtPence: project.warn_at_pence,
        spentPence: spend.byProject[projectId] ?? 0,
      });
    }
  }

  limits.push({
    scope: "task",
    limitPence: task.budgetPence,
    warnAtPence: Math.floor(task.budgetPence * 0.8),
    spentPence: task.spentPence,
  });

  return limits;
}
