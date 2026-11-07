import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { BudgetLimit } from "@/lib/ai/budget";
import { buildBudgetLimits, type BudgetSetting, type MonthlySpend } from "@/lib/ai/budget-limits";

/**
 * Reads this agency's budget settings and this month's agent spend from the database, then returns the
 * limits the runner checks before each model call. Uses the server's secret key, like the run store.
 */
export async function loadBudgetLimits(
  db: SupabaseClient,
  task: { tenantId: string; agentKey: string; projectId: string | null; id: string; budgetPence: number; spentPence: number },
  now: Date = new Date(),
): Promise<BudgetLimit[]> {
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  const [settingsRes, tasksRes] = await Promise.all([
    db.from("ai_budget_settings").select("scope, scope_id, monthly_limit_pence, warn_at_pence").eq("tenant_id", task.tenantId),
    db
      .from("ai_tasks")
      .select("agent_key, project_id, spent_pence")
      .eq("tenant_id", task.tenantId)
      .gte("created_at", monthStart),
  ]);
  if (settingsRes.error) throw new Error("Could not read the AI budget settings");
  if (tasksRes.error) throw new Error("Could not read this month's AI spend");

  const spend: MonthlySpend = { total: 0, byAgent: {}, byProject: {} };
  for (const row of (tasksRes.data ?? []) as Array<{ agent_key: string; project_id: string | null; spent_pence: number }>) {
    const amount = Number(row.spent_pence ?? 0);
    spend.total += amount;
    spend.byAgent[row.agent_key] = (spend.byAgent[row.agent_key] ?? 0) + amount;
    if (row.project_id) spend.byProject[row.project_id] = (spend.byProject[row.project_id] ?? 0) + amount;
  }

  return buildBudgetLimits({
    settings: (settingsRes.data ?? []) as BudgetSetting[],
    spend,
    agentKey: task.agentKey,
    projectId: task.projectId,
    task: { id: task.id, budgetPence: task.budgetPence, spentPence: task.spentPence },
  });
}
