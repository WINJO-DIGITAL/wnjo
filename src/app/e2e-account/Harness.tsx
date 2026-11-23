"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { useMemo } from "react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { PlanSummary } from "@/components/account/PlanSummary";

const iso = (days: number) => new Date(Date.now() + days * 24 * 3600 * 1000).toISOString();

/** Enough of the database client for the plan card to read a made-up plan. It writes nothing. */
function stubClient(): SupabaseClient {
  const rpc = async () => ({
    data: [{ status: "active", kind: "subscription", package_code: "core", package_name: "Core", monthly_pence: 9900, current_period_end: iso(9), cancel_at_period_end: false }],
    error: null,
  });
  return { rpc } as unknown as SupabaseClient;
}

/** The account page's two-column layout, with the plan beside a made-up website card. */
export function Harness() {
  const client = useMemo(() => stubClient(), []);
  return (
    <div className="acct acct--split">
      <DashboardHeader variant="customer" />
      <div className="dash-page__head">
        <h1 className="dash-title">Your websites</h1>
      </div>
      <aside className="acct__side" aria-label="Your plan">
        <PlanSummary client={client} />
      </aside>
      <div className="acct__main">
        <article className="acct-order">
          <p className="build-card__sub">Managed website</p>
          <h2 className="h2">Autism Initiatives</h2>
          <p className="acct-meta">Your preview is ready to look at.</p>
        </article>
      </div>
    </div>
  );
}
