"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { formatPence } from "@/lib/pricing";
import { planInfo } from "@/lib/portal/plan-info";

type Row = { status: string; kind: string; package_code: string | null; package_name: string; monthly_pence: number; current_period_end: string | null; cancel_at_period_end: boolean };
const day = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long" });

/**
 * The customer's plan at a glance, at the top of their account: what they're on, what they pay and when it is next
 * taken. Shown only once a plan is running; an overdue payment is said plainly, with the way to fix it.
 */
export function PlanSummary({ client }: { client: SupabaseClient }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    client.rpc("my_plans").then(({ data, error }) => {
      if (!cancelled) setRows(error ? [] : ((data as Row[]) ?? []));
    });
    return () => {
      cancelled = true;
    };
  }, [client]);

  const live = (rows ?? []).filter((r) => r.status === "active" || r.status === "past_due");
  if (live.length === 0) return null;
  const monthly = live.filter((r) => r.kind === "subscription").reduce((sum, r) => sum + r.monthly_pence, 0);
  const next = live
    .filter((r) => r.status === "active" && !r.cancel_at_period_end && r.current_period_end)
    .map((r) => r.current_period_end as string)
    .sort()[0];
  const overdue = live.some((r) => r.status === "past_due");
  const names = [...new Set(live.map((r) => planInfo(r.package_code, r.package_name).name))].join(" and ");

  return (
    <div className="plan-summary">
      {overdue && (
        <p className="plan__alert" role="alert">
          Your last payment didn&apos;t go through. <Link href="/account/billing">Update your card</Link> and we&apos;ll try again.
        </p>
      )}
      <dl className="figures">
        <div><dt>Your plan</dt><dd>{names}</dd></div>
        <div><dt>You pay</dt><dd>{formatPence(monthly)} <span className="figures__unit">a month</span></dd></div>
        <div><dt>Next payment</dt><dd>{next ? day.format(new Date(next)) : "–"}</dd></div>
        <div className="figures__link"><Link href="/account/billing">Plan &amp; billing →</Link></div>
      </dl>
    </div>
  );
}
