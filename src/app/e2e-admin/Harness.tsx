"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { useMemo } from "react";
import { BuildsAdmin } from "@/components/admin/BuildsAdmin";
import { CustomersAdmin } from "@/components/admin/CustomersAdmin";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { OverviewAdmin } from "@/components/admin/OverviewAdmin";

const iso = (days: number) => new Date(Date.now() + days * 24 * 3600 * 1000).toISOString();

/** Made-up records, so the staff screens can be seen and tested without signing in. */
const sub = (n: number, o: Record<string, unknown>) => ({
  id: `s${n}`, reference: `WS-00000${n}`, kind: "subscription", status: "active", name: "Customer", business_name: null, email: `c${n}@x.test`, package_code: "silver", package_name: "Plus",
  setup_pence: 0, monthly_pence: 14900, one_off_pence: 0, payments_count: 3, cancel_at_period_end: false, livemode: true, current_period_end: iso(20), first_payment_at: iso(-40), last_payment_at: iso(-10), created_at: iso(-60), ...o,
});
const brief = (n: number, o: Record<string, unknown>) => ({
  id: `00000000-0000-4000-8000-00000000000${n}`, reference: `WNJO-00000${n}`, name: "Owner", business_name: null, email: `b${n}@x.test`, route: "package", stage: "specification", expected_by: null, created_at: iso(-n), updated_at: iso(-n), brief: { goals: ["enquiries"] }, figures: { package: "Core", mode: "monthly", monthly: 9900, oneOffTotal: 0 }, version: 1, ...o,
});

const TABLES: Record<string, unknown[]> = {
  website_subscriptions: [
    sub(1, { name: "Ada Lake", business_name: "Lake Bakery", email: "ada@lake.test", current_period_end: iso(3) }),
    sub(2, { name: "Raj Patel", business_name: "Patel Plumbing", email: "raj@patel.test", status: "past_due", package_name: "Core", monthly_pence: 9900, current_period_end: iso(-4) }),
    sub(3, { name: "Mia Chen", business_name: "Chen Dental", email: "mia@chen.test", package_name: "Pro", monthly_pence: 19900, current_period_end: iso(26) }),
    sub(4, { name: "Tom Hill", business_name: "Hill Joinery", email: "tom@hill.test", cancel_at_period_end: true, current_period_end: iso(9) }),
    sub(5, { name: "Sam Ode", business_name: "Ode Accounting", email: "sam@ode.test", status: "offered", package_name: "Core", monthly_pence: 9900, current_period_end: null, payments_count: 0 }),
  ],
  website_briefs: [
    brief(1, { business_name: "Autism Initiatives", name: "Nitisat", stage: "specification", expected_by: iso(4).slice(0, 10) }),
    brief(2, { business_name: "Hill Joinery", stage: "changes" }),
    brief(3, { business_name: "Harbour Estate Agents", route: "proposal", stage: "reviewing" }),
    brief(4, { business_name: "Ode Accounting", stage: "specification", brief: { goals: [] } }),
    brief(5, { business_name: "Green Gym", stage: "building", expected_by: iso(9).slice(0, 10) }),
    brief(6, { business_name: "Little Steps Nursery", stage: "specification" }),
  ],
  enquiries: [
    { id: "e1", reference: "WNJO-501", kind: "contact", name: "Mia Chen", email: "mia@chen.test", topic: "other", created_at: iso(-0.1), handled_at: null },
    { id: "e2", reference: "WNJO-502", kind: "website", name: "Priya Shah", email: "priya@shah.test", topic: null, created_at: iso(-1), handled_at: null },
    { id: "e3", reference: "WNJO-503", kind: "contact", name: "Tom Hill", email: "tom@hill.test", topic: "other", created_at: iso(-2), handled_at: iso(-1) },
  ],
  website_subscription_payments: [{ subscription_id: "s1", amount_pence: 14900, paid_at: iso(-1) }],
  website_subscription_events: [],
  website_brief_events: [],
};
const COUNTS: Record<string, number> = { website_cancellation_requests: 1, website_previews: 2, build_revisions: 1, "website_proposals:pending_approval": 1, quotes: 1 };

/** Enough of the database client for the staff screens to read these records. It writes nothing. */
function stubClient(): SupabaseClient {
  const from = (table: string) => {
    let head = false;
    let eq = "";
    const builder: Record<string, unknown> = {};
    for (const m of ["order", "limit", "in", "neq", "gte", "lte", "is", "not", "maybeSingle"]) builder[m] = () => builder;
    builder.select = (_cols: string, opts?: { head?: boolean }) => {
      head = Boolean(opts?.head);
      return builder;
    };
    builder.eq = (_col: string, value: string) => {
      eq = value;
      return builder;
    };
    builder.then = (resolve: (v: unknown) => unknown) =>
      resolve(head ? { count: COUNTS[`${table}:${eq}`] ?? COUNTS[table] ?? 0, data: null, error: null } : { data: TABLES[table] ?? [], error: null });
    return builder;
  };
  // Enough of the sign-in client for a screen that asks who is signed in. Nothing is sent anywhere.
  const auth = { getSession: async () => ({ data: { session: null }, error: null }) };
  return { from, auth } as unknown as SupabaseClient;
}

export function Harness({ view }: { view: string }) {
  const client = useMemo(() => stubClient(), []);
  return (
    <div className="admin">
      <DashboardHeader variant="staff" />
      <div className="dash-page__head">
        <h1 className="dash-title">{view === "customers" ? "Customers" : view === "builds" ? "Websites" : "Today"}</h1>
      </div>
      {view === "customers" && <CustomersAdmin client={client} tenantId="t1" />}
      {view === "builds" && <BuildsAdmin client={client} />}
      {view !== "customers" && view !== "builds" && <OverviewAdmin client={client} />}
    </div>
  );
}
