"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { formatPence } from "@/lib/pricing";
import { CANCEL_COMMENT_MAX, CANCEL_REASONS, type CancelReason } from "@/lib/cancel-request";

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
      {isMonthly && manageable && <CancelRequest client={client} reference={row.reference} />}
    </article>
  );
}

/**
 * Asking to cancel, on the customer's own plan. It is as easy as it should be: one button, an optional reason, and a
 * clear confirmation. Nothing is cancelled here; the request is recorded with the time they asked, they get an email,
 * and we confirm the end date.
 */
function CancelRequest({ client, reference }: { client: SupabaseClient; reference: string }) {
  const [state, setState] = useState<"loading" | "hidden" | "ready" | "open" | "sent">("loading");
  const [reason, setReason] = useState<CancelReason | "">("");
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const call = async (body: Record<string, unknown>) => {
    const { data } = await client.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return null;
    const res = await fetch("/api/account/cancel-request", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ reference, ...body }),
    }).catch(() => null);
    return res ? { ok: res.ok, json: (await res.json().catch(() => null)) as { canRequest?: boolean; requested?: boolean; error?: string } | null } : null;
  };

  useEffect(() => {
    let cancelled = false;
    void call({ action: "status" }).then((r) => {
      if (cancelled) return;
      if (!r?.ok) return setState("hidden");
      setState(r.json?.requested ? "sent" : r.json?.canRequest ? "ready" : "hidden");
    });
    return () => {
      cancelled = true;
    };
    // The status is read once per plan.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reference]);

  if (state === "loading" || state === "hidden") return null;

  if (state === "sent") {
    return (
      <p className="billing-row__note" role="status">
        You&apos;ve asked to cancel this plan. We&apos;ve emailed you, and we&apos;ll confirm by email when it will end. Nothing changes until then.
      </p>
    );
  }

  const send = async () => {
    setBusy(true);
    setError(null);
    const r = await call({ action: "request", reason, comment });
    setBusy(false);
    if (r?.ok) setState("sent");
    else setError(r?.json?.error && r.json.error !== "rate_limited" && r.json.error !== "sign_in" ? r.json.error : "We couldn't send that just now. Please try again, or reply to our email.");
  };

  if (state === "ready") {
    return (
      <button type="button" className="billing-row__link billing-row__link--quiet" onClick={() => setState("open")}>
        Request cancellation
      </button>
    );
  }

  return (
    <div className="cancel-request" role="group" aria-label="Request cancellation">
      <p className="cancel-request__lead">Tell us why, if you&apos;d like to. You don&apos;t have to.</p>
      <div className="brief-chips" role="group" aria-label="Reason">
        {(Object.keys(CANCEL_REASONS) as CancelReason[]).map((k) => (
          <button key={k} type="button" className="brief-chip" aria-pressed={reason === k} onClick={() => setReason(reason === k ? "" : k)}>
            {CANCEL_REASONS[k]}
          </button>
        ))}
      </div>
      <label className="visually-hidden" htmlFor={`cancel-${reference}`}>
        Anything else you&apos;d like us to know (optional)
      </label>
      <textarea id={`cancel-${reference}`} className="textarea" rows={3} maxLength={CANCEL_COMMENT_MAX} value={comment} placeholder="Anything else you'd like us to know (optional)" onChange={(e) => setComment(e.target.value)} />
      <p className="cancel-request__note">We&apos;ll email you to confirm when it will end. Nothing changes until then, and your website stays live.</p>
      {error && <p className="billing-row__error" role="alert">{error}</p>}
      <div className="btn-row">
        <button type="button" className="btn btn--primary" disabled={busy} onClick={() => void send()}>
          {busy ? "Sending…" : "Send cancellation request"}
        </button>
        <button type="button" className="btn btn--secondary" disabled={busy} onClick={() => setState("ready")}>
          Keep my plan
        </button>
      </div>
    </div>
  );
}
