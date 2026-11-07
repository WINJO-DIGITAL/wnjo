import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ToolRegistry, type ToolDefinition } from "@/lib/ai/tools";

/**
 * Tier 1: read-only tools. An agent can look at the business and report on it, and nothing else. None of
 * these is high-risk, but each still needs an explicit permission for the agent. Results leave out customer
 * contact details, so an agent only sees what the task needs.
 */

export type SummaryRows = {
  enquiriesLast7Days: number;
  quotesSent: number;
  ordersNotLive: number;
  depositsPaidPence: number;
  openApprovals: number;
};

/** Plain text an agent can read. Pure, so it can be tested without a database. */
export function formatSummary(s: SummaryRows): string {
  const pounds = (pence: number) => `£${(pence / 100).toFixed(2)}`;
  return [
    `New enquiries in the last 7 days: ${s.enquiriesLast7Days}.`,
    `Quotes sent and not yet answered: ${s.quotesSent}.`,
    `Orders not yet live: ${s.ordersNotLive}.`,
    `Deposits received, all time: ${pounds(s.depositsPaidPence)}.`,
    `Approvals waiting on a client: ${s.openApprovals}.`,
  ].join("\n");
}

export function clampLimit(raw: unknown, fallback = 10, max = 25): number {
  const n = typeof raw === "number" ? Math.floor(raw) : Number(raw);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(n, max);
}

const readOnly = (
  name: string,
  description: string,
  run: ToolDefinition["run"],
  validate: ToolDefinition["validate"] = () => null,
): ToolDefinition => ({ name, description, highRisk: false, validate, run });

/** Builds the tier 1 registry for one server-side database client. Every query is limited to the task's agency. */
export function buildReadToolRegistry(db: SupabaseClient): ToolRegistry {
  const registry = new ToolRegistry();

  registry.register(
    readOnly("business_summary", "Headline numbers for the business today: enquiries, quotes, orders, deposits, approvals.", async (_args, ctx) => {
      const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
      const [enq, quotes, orders, deposits, approvals] = await Promise.all([
        db.from("enquiries").select("id", { count: "exact", head: true }).eq("tenant_id", ctx.tenantId).gte("created_at", weekAgo),
        db.from("quotes").select("id", { count: "exact", head: true }).eq("tenant_id", ctx.tenantId).eq("status", "sent"),
        db.from("orders").select("id", { count: "exact", head: true }).eq("tenant_id", ctx.tenantId).neq("stage", "live"),
        db.from("deposits").select("amount_pence").eq("tenant_id", ctx.tenantId).eq("status", "paid"),
        db.from("approval_requests").select("id", { count: "exact", head: true }).eq("tenant_id", ctx.tenantId).eq("status", "open"),
      ]);
      const failed = [enq, quotes, orders, deposits, approvals].find((r) => r.error);
      if (failed) throw new Error("The summary could not be read.");
      const paid = ((deposits.data ?? []) as { amount_pence: number }[]).reduce((sum, d) => sum + d.amount_pence, 0);
      return formatSummary({
        enquiriesLast7Days: enq.count ?? 0,
        quotesSent: quotes.count ?? 0,
        ordersNotLive: orders.count ?? 0,
        depositsPaidPence: paid,
        openApprovals: approvals.count ?? 0,
      });
    }),
  );

  registry.register(
    readOnly(
      "list_open_orders",
      "Orders not yet live: business, project type, stage and when the stage last changed. Up to 25.",
      async (args, ctx) => {
        const { data, error } = await db
          .from("orders")
          .select("business_name, project_type, stage, stage_updated_at")
          .eq("tenant_id", ctx.tenantId)
          .neq("stage", "live")
          .order("stage_updated_at", { ascending: true })
          .limit(clampLimit(args.limit));
        if (error) throw new Error("Orders could not be read.");
        const rows = (data ?? []) as Array<{ business_name: string; project_type: string; stage: string; stage_updated_at: string }>;
        if (rows.length === 0) return "No orders are waiting to go live.";
        return rows
          .map((r) => `${r.business_name} (${r.project_type}): ${r.stage}, stage set ${r.stage_updated_at.slice(0, 10)}.`)
          .join("\n");
      },
    ),
  );

  registry.register(
    readOnly(
      "list_recent_enquiries",
      "Recent enquiries: reference, topic, budget and timeline, and when they arrived. No names or emails. Up to 25.",
      async (args, ctx) => {
        const { data, error } = await db
          .from("enquiries")
          .select("reference, topic, budget, timeline, created_at")
          .eq("tenant_id", ctx.tenantId)
          .order("created_at", { ascending: false })
          .limit(clampLimit(args.limit));
        if (error) throw new Error("Enquiries could not be read.");
        const rows = (data ?? []) as Array<{ reference: string; topic: string | null; budget: string | null; timeline: string | null; created_at: string }>;
        if (rows.length === 0) return "No enquiries yet.";
        return rows
          .map((r) => `${r.reference}: ${r.topic ?? "no topic"}, budget ${r.budget ?? "not given"}, timeline ${r.timeline ?? "not given"}, received ${r.created_at.slice(0, 10)}.`)
          .join("\n");
      },
    ),
  );

  registry.register(
    readOnly(
      "list_open_approvals",
      "Approval requests waiting on a client: what they are for and how long they have been open. Up to 25.",
      async (args, ctx) => {
        const { data, error } = await db
          .from("approval_requests")
          .select("title, kind, created_at")
          .eq("tenant_id", ctx.tenantId)
          .eq("status", "open")
          .order("created_at", { ascending: true })
          .limit(clampLimit(args.limit));
        if (error) throw new Error("Approvals could not be read.");
        const rows = (data ?? []) as Array<{ title: string; kind: string; created_at: string }>;
        if (rows.length === 0) return "No approvals are waiting.";
        return rows.map((r) => `${r.title} (${r.kind}), open since ${r.created_at.slice(0, 10)}.`).join("\n");
      },
    ),
  );

  return registry;
}
