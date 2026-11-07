/**
 * Owner settings for the AI layer: the global monthly budget and each agent's switches. Pure validation, so the
 * rules are tested without a database. Money is whole pence. A negative or fractional value is refused, and a
 * warning level above the limit is refused, because it could never fire.
 */

export const AGENT_KEYS = ["project_manager", "developer", "qa_engineer", "client_success", "operations_manager"] as const;
export type AgentKey = (typeof AGENT_KEYS)[number];

export type BudgetChange = { action: "budget"; monthlyPence: number; warnAtPence: number };
export type AgentChange = { action: "agent"; agentKey: AgentKey; enabled: boolean; paused: boolean };
export type SettingsChange = BudgetChange | AgentChange;

export const MAX_MONTHLY_PENCE = 1_000_000; // £10,000 a month, a sanity ceiling for a small agency.

export function parseSettingsChange(input: unknown): { ok: true; change: SettingsChange } | { ok: false; reason: string } {
  if (!input || typeof input !== "object") return { ok: false, reason: "The settings change is missing." };
  const body = input as Record<string, unknown>;

  if (body.action === "budget") {
    const monthly = body.monthlyPence;
    const warn = body.warnAtPence;
    if (!isWholeNumber(monthly) || monthly < 0 || monthly > MAX_MONTHLY_PENCE) {
      return { ok: false, reason: "The monthly budget must be a whole number of pence, from 0 to £10,000." };
    }
    if (!isWholeNumber(warn) || warn < 0) return { ok: false, reason: "The warning level must be a whole number of pence." };
    if (warn > monthly) return { ok: false, reason: "The warning level can't be above the monthly budget." };
    return { ok: true, change: { action: "budget", monthlyPence: monthly, warnAtPence: warn } };
  }

  if (body.action === "agent") {
    const key = body.agentKey;
    if (typeof key !== "string" || !(AGENT_KEYS as readonly string[]).includes(key)) {
      return { ok: false, reason: "That agent doesn't exist." };
    }
    if (typeof body.enabled !== "boolean" || typeof body.paused !== "boolean") {
      return { ok: false, reason: "Enabled and paused must each be true or false." };
    }
    return { ok: true, change: { action: "agent", agentKey: key as AgentKey, enabled: body.enabled, paused: body.paused } };
  }

  return { ok: false, reason: "Unknown settings change." };
}

function isWholeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value);
}
