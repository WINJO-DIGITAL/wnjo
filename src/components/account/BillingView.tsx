"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { formatPence } from "@/lib/pricing";

type Subscription = {
  id: string;
  reference: string;
  enquiry_reference: string | null;
  kind: "subscription" | "one_off";
  status: string;
  package_name: string;
  monthly_pence: number;
  one_off_pence: number;
  payments_count: number;
  ownership_after_payments: number;
  ownership_eligible_at: string | null;
};

const STATUS: Record<string, string> = {
  offered: "Waiting for payment",
  active: "Active",
  past_due: "Payment overdue",
  cancelled: "Ended",
  paid: "Paid in full",
  expired: "Expired",
};

/** Plan and billing: each plan the customer has, what they pay, and their billing page. */
export function BillingView() {
  const client = supabase();
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    if (!client) return;
    client.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = client.auth.onAuthStateChange((_e, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, [client]);

  if (!client || session === undefined) return <p className="lede">Loading…</p>;
  if (!session) {
    return (
      <p className="lede">
        Please <Link href="/account">sign in</Link> to see your plan and billing.
      </p>
    );
  }
  return (
    <div className="acct">
      <div className="dash-page__head">
        <h1 className="dash-title">Plan &amp; billing</h1>
      </div>
      <Plans client={client} />
    </div>
  );
}

function Plans({ client }: { client: SupabaseClient }) {
  const [rows, setRows] = useState<Subscription[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    client
      .rpc("my_subscriptions")
      .then(({ data, error: err }) => {
        if (cancelled) return;
        setError(Boolean(err));
        setRows(err ? null : ((data as Subscription[]) ?? []));
      });
    return () => {
      cancelled = true;
    };
  }, [client]);

  if (error) return <p role="alert">We couldn&apos;t load your plans. Please refresh the page.</p>;
  if (rows === null) return <p className="lede">Loading…</p>;
  if (rows.length === 0) return <p className="lede">No plans yet.</p>;

  // What the customer pays each month across plans that are running.
  const monthly = rows.filter((r) => r.kind === "subscription" && (r.status === "active" || r.status === "past_due")).reduce((sum, r) => sum + r.monthly_pence, 0);

  return (
    <div className="billing">
      {monthly > 0 && <p className="billing__total">{formatPence(monthly)} <span>a month</span></p>}
      <div className="billing-list">
        {rows.map((r) => (
          <Plan key={r.id} client={client} row={r} />
        ))}
      </div>
    </div>
  );
}

function Plan({ client, row }: { client: SupabaseClient; row: Subscription }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMonthly = row.kind === "subscription";
  const manageable = row.status === "active" || row.status === "past_due";
  const progress = isMonthly && row.ownership_after_payments > 0 ? Math.min(100, Math.round((row.payments_count / row.ownership_after_payments) * 100)) : null;

  const openBilling = async () => {
    setBusy(true);
    setError(null);
    const { data } = await client.auth.getSession();
    const token = data.session?.access_token;
    const res = token
      ? await fetch("/api/account/billing", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ reference: row.reference }),
        }).catch(() => null)
      : null;
    const json = (await res?.json().catch(() => null)) as { url?: string; error?: string } | null;
    if (res?.ok && json?.url) {
      window.location.assign(json.url);
      return;
    }
    setBusy(false);
    setError(
      json?.error === "not_found"
        ? "Billing isn't available for this plan yet. Reply to our email and we'll help."
        : "We couldn't open your billing page. Please try again, or reply to our email.",
    );
  };

  return (
    <article className="billing-row">
      <div className="billing-row__main">
        <p className="billing-row__ref">{row.reference}</p>
        <h2 className="billing-row__name">{row.package_name}</h2>
        <p className="billing-row__status">{STATUS[row.status] ?? row.status}</p>
      </div>
      <p className="billing-row__price">{isMonthly ? `${formatPence(row.monthly_pence)} a month` : `${formatPence(row.one_off_pence)} once`}</p>
      {progress !== null && !row.ownership_eligible_at && (
        <div className="billing-row__progress">
          <div
            className="meter"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={row.ownership_after_payments}
            aria-valuenow={row.payments_count}
            aria-label={`${row.payments_count} of ${row.ownership_after_payments} payments`}
          >
            <span style={{ width: `${progress}%` }} />
          </div>
          <p>{row.payments_count} of {row.ownership_after_payments} payments</p>
        </div>
      )}
      {isMonthly && row.ownership_eligible_at && (
        <p className="billing-row__note">Ownership is available to you now. Message us whenever you&apos;d like to talk it through.</p>
      )}
      {manageable && (
        <button type="button" className="billing-row__link" disabled={busy} onClick={() => void openBilling()}>
          {busy ? "Opening…" : "Manage billing"} <span aria-hidden="true">→</span>
        </button>
      )}
      {error && <p className="billing-row__error" role="alert">{error}</p>}
    </article>
  );
}
