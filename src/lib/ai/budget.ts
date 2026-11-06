/**
 * Budget gate. Every model call is checked against the task, agent, project and global limits. The strictest
 * limit that applies decides. Pure, so the same rule is used everywhere and is easy to test.
 */

export type BudgetLimit = { scope: "global" | "agent" | "project" | "task"; limitPence: number; warnAtPence: number; spentPence: number };

export type BudgetVerdict =
  | { outcome: "allow"; warnings: string[] }
  | { outcome: "stop"; limitingScope: BudgetLimit["scope"]; reason: string };

/** Asks whether a model call costing `nextCostPence` may go ahead. */
export function checkBudgets(limits: BudgetLimit[], nextCostPence: number): BudgetVerdict {
  const warnings: string[] = [];
  for (const limit of limits) {
    if (limit.spentPence + nextCostPence > limit.limitPence) {
      return {
        outcome: "stop",
        limitingScope: limit.scope,
        reason: `The ${limit.scope} budget would be exceeded (limit ${limit.limitPence}p).`,
      };
    }
    if (limit.spentPence + nextCostPence >= limit.warnAtPence) {
      warnings.push(`The ${limit.scope} budget has reached its warning threshold.`);
    }
  }
  return { outcome: "allow", warnings };
}
