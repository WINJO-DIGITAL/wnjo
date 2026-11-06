/**
 * Permission and budget decisions. Pure functions: the runner asks, the answer is recorded, and nothing is
 * allowed by default. An agent can never grant itself a permission; permissions come from ai_permissions.
 */

import type { ToolDefinition } from "@/lib/ai/tools";

export type ToolDecision =
  | { outcome: "allow" }
  | { outcome: "deny"; reason: string }
  | { outcome: "needs_approval"; reason: string };

export function decideToolUse(input: {
  agentKey: string;
  agentEnabled: boolean;
  agentPaused: boolean;
  tool: ToolDefinition | undefined;
  /** Permissions for this agent: tool name -> allowed. Missing means denied. */
  permissions: Record<string, boolean>;
  approved: boolean;
}): ToolDecision {
  if (!input.agentEnabled) return { outcome: "deny", reason: "The agent is disabled." };
  if (input.agentPaused) return { outcome: "deny", reason: "The agent is paused." };
  if (!input.tool) return { outcome: "deny", reason: "That tool does not exist." };
  if (input.permissions[input.tool.name] !== true) {
    return { outcome: "deny", reason: `${input.agentKey} is not permitted to use ${input.tool.name}.` };
  }
  if (input.tool.highRisk && !input.approved) {
    return { outcome: "needs_approval", reason: `${input.tool.name} needs an owner approval first.` };
  }
  return { outcome: "allow" };
}

export type BudgetState = { limitPence: number; spentPence: number };

/** A task may start another model call only while it has budget left. */
export function budgetRemaining(state: BudgetState): number {
  return Math.max(0, state.limitPence - state.spentPence);
}

export function canSpend(state: BudgetState, nextCostPence: number): boolean {
  return nextCostPence <= budgetRemaining(state);
}
