/** Figures shared by the server and the admin screen (no Node-only imports, so the browser can use it). */

/** Monthly recurring revenue in pence: active and past-due subscriptions (past-due are still owed). */
export function monthlyRecurringPence(rows: { kind: string; status: string; monthly_pence: number; cancel_at_period_end?: boolean }[]): number {
  return rows
    .filter((r) => r.kind === "subscription" && (r.status === "active" || r.status === "past_due"))
    .reduce((sum, r) => sum + r.monthly_pence, 0);
}
