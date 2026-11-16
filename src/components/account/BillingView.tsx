"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { formatPence } from "@/lib/pricing";
import { planInfo, PLAN_RULES } from "@/lib/portal/plan-info";
import { CANCEL_COMMENT_MAX, CANCEL_REASONS, type CancelReason } from "@/lib/cancel-request";

type Subscription = {
  id: string;
  reference: string;
  enquiry_reference: string | null;
  kind: "subscription" | "one_off";
  status: string;
  package_code: string | null;
  package_name: string;
  business_name: string | null;
  monthly_pence: number;
  one_off_pence: number;
  payments_count: number;
  ownership_after_payments: number;
  ownership_eligible_at: string | null;
  last_payment_at: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  cancelled_at: string | null;
  offer_expires_at: string | null;
  created_at: string;
};
type Payment = { subscription_id: string; reference: string; amount_pence: number; billing_reason: string | null; paid_at: string };

const STATUS: Record<string, string> = {
  offered: "Waiting for payment",
  active: "Active",
  past_due: "Payment overdue",
  cancelled: "Ended",
  paid: "Paid in full",
  expired: "Expired",
};
const day = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" });
const date = (iso: string | null | undefined) => (iso ? day.format(new Date(iso)) : "");
const running = (r: Subscription) => r.status === "active" || r.status === "past_due";

/** Plan and billing: each plan the customer has, what it includes, what they pay and when, and their billing page. */
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
      <Plans client={client} email={session.user.email ?? ""} />
    </div>
  );
}

function Plans({ client, email }: { client: SupabaseClient; email: string }) {
  const [rows, setRows] = useState<Subscription[] | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  // When the plans were read, so "works until" is only said of a link that hadn't expired then.
  const [readAt, setReadAt] = useState(0);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([client.rpc("my_plans"), client.rpc("my_payments")]).then(([plans, paid]) => {
      if (cancelled) return;
      setReadAt(Date.now());
      setError(Boolean(plans.error));
      setRows(plans.error ? null : ((plans.data as Subscription[]) ?? []));
      // Payment history is extra: the page still works if it can't be read.
      setPayments(paid.error ? [] : ((paid.data as Payment[]) ?? []));
    });
    return () => {
      cancelled = true;
    };
  }, [client]);

  if (error) return <p role="alert">We couldn&apos;t load your plans. Please refresh the page.</p>;
  if (rows === null) return <p className="lede">Loading…</p>;
  if (rows.length === 0) {
    return (
      <div className="acct-empty">
        <p className="acct-empty__title">No plan yet</p>
        <p className="acct-empty__body">Your plan appears here as soon as it starts.</p>
        <Link href="/pricing" className="btn btn--primary">See the plans</Link>
      </div>
    );
  }

  const live = rows.filter(running);
  const paidOnce = rows.filter((r) => r.status === "paid");
  // A payment link can be sent more than once. Only the newest one for each plan is worth showing.
  const waiting = rows.filter((r) => r.status === "offered").filter((r, i, all) => all.findIndex((x) => x.package_name === r.package_name && x.kind === r.kind) === i);
  const ended = rows.filter((r) => r.status === "cancelled");
  const monthly = live.filter((r) => r.kind === "subscription").reduce((sum, r) => sum + r.monthly_pence, 0);
  const next = live
    .filter((r) => r.status === "active" && !r.cancel_at_period_end && r.current_period_end)
    .map((r) => r.current_period_end as string)
    .sort()[0];
  const hasMonthly = [...live, ...waiting].some((r) => r.kind === "subscription");

  return (
    <div className="plans">
      <div className="plans__main">
        {live.length > 0 && (
          <dl className="figures">
            <div><dt>You pay</dt><dd>{formatPence(monthly)} <span className="figures__unit">a month</span></dd></div>
            <div><dt>Next payment</dt><dd>{next ? date(next) : "–"}</dd></div>
          </dl>
        )}

        {[...live, ...paidOnce].map((r) => (
          <Plan key={r.id} client={client} row={r} payments={payments.filter((p) => p.subscription_id === r.id)} />
        ))}

        {waiting.length > 0 && (
          <section className="plans__group" aria-labelledby="plans-waiting">
            <h2 id="plans-waiting" className="plans__label">Waiting for your first payment</h2>
            {waiting.map((r) => (
              <article key={r.id} className="plan plan--quiet">
                <div className="plan__head">
                  <div>
                    <h3 className="plan__name">{planInfo(r.package_code, r.package_name).name}</h3>
                    <p className="plan__ref">{r.reference}</p>
                  </div>
                  <p className="plan__price">{r.kind === "subscription" ? <>{formatPence(r.monthly_pence)} <span>a month</span></> : <>{formatPence(r.one_off_pence)} <span>once</span></>}</p>
                </div>
                <p className="plan__note">
                  We emailed your payment link to {email}.{r.offer_expires_at && new Date(r.offer_expires_at).getTime() > readAt ? ` It works until ${date(r.offer_expires_at)}.` : ""} Nothing is charged until you use it.
                </p>
                <p className="plan__note"><Link href="/account/help">Can&apos;t find the email? Ask us for a new link</Link></p>
              </article>
            ))}
          </section>
        )}

        {ended.length > 0 && (
          <section className="plans__group" aria-labelledby="plans-ended">
            <h2 id="plans-ended" className="plans__label">Ended</h2>
            <ul className="plans__ended">
              {ended.map((r) => (
                <li key={r.id}>
                  <span>{planInfo(r.package_code, r.package_name).name} <span className="plans__ref">{r.reference}</span></span>
                  <span>{r.cancelled_at ? `Ended ${date(r.cancelled_at)}` : "Ended"}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {hasMonthly && (
        <aside className="plans__side" aria-labelledby="plans-rules">
          <h2 id="plans-rules" className="plans__label">How your plan works</h2>
          <ul className="ticks">
            {PLAN_RULES.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
          <p className="plan__note"><Link href="/terms">Read the full terms</Link></p>
        </aside>
      )}
    </div>
  );
}

function Plan({ client, row, payments }: { client: SupabaseClient; row: Subscription; payments: Payment[] }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMonthly = row.kind === "subscription";
  const manageable = running(row);
  const info = planInfo(row.package_code, row.package_name);
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
        ? "Billing isn't available for this plan yet. Message us and we'll help."
        : "We couldn't open your billing page. Please try again, or message us.",
    );
  };

  return (
    <article className="plan">
      <div className="plan__head">
        <div>
          <h2 className="plan__name">{info.name}</h2>
          <p className="plan__ref">{[row.business_name, row.reference].filter(Boolean).join(" · ")}</p>
        </div>
        <p className="plan__price">{isMonthly ? <>{formatPence(row.monthly_pence)} <span>a month</span></> : <>{formatPence(row.one_off_pence)} <span>once</span></>}</p>
      </div>

      <p className={`state state--${row.status === "past_due" ? "overdue" : row.cancel_at_period_end ? "ending" : "active"}`}>
        {row.cancel_at_period_end && row.current_period_end ? `Ends ${date(row.current_period_end)}` : STATUS[row.status] ?? row.status}
      </p>
      {row.status === "past_due" && <p className="plan__alert" role="alert">Your last payment didn&apos;t go through. Update your card under Manage billing and we&apos;ll try again.</p>}

      {info.includes.length > 0 && (
        <details className="plan__includes">
          <summary>What&apos;s included</summary>
          <ul className="ticks ticks--cols">
            {info.includes.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </details>
      )}

      {progress !== null && !row.ownership_eligible_at && (
        <div className="billing-row__progress">
          <div className="meter" role="progressbar" aria-valuemin={0} aria-valuemax={row.ownership_after_payments} aria-valuenow={row.payments_count} aria-label={`${row.payments_count} of ${row.ownership_after_payments} payments`}>
            <span style={{ width: `${progress}%` }} />
          </div>
          <p>{row.payments_count} of {row.ownership_after_payments} payments</p>
        </div>
      )}
      {isMonthly && row.ownership_eligible_at && (
        <p className="billing-row__note">Ownership is available to you now. Message us whenever you&apos;d like to talk it through.</p>
      )}

      {payments.length > 0 && (
        <details className="plan__includes">
          <summary>Payments ({payments.length})</summary>
          <table className="plan__payments">
            <tbody>
              {payments.map((p, i) => (
                <tr key={i}>
                  <td>{date(p.paid_at)}</td>
                  <td>{formatPence(p.amount_pence)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}

      <div className="plan__actions">
        {manageable && (
          <button type="button" className="btn btn--secondary" disabled={busy} onClick={() => void openBilling()}>
            {busy ? "Opening…" : "Manage billing"}
          </button>
        )}
        {manageable && <span className="plan__hint">Update your card and download invoices.</span>}
      </div>
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
        Your plan is cancelled. We&apos;ve emailed you the date it ends, which is the end of the billing period you&apos;ve already paid for.
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
      <p className="cancel-request__note">Your plan ends at the end of the billing period you&apos;ve already paid for. No further payments are taken after that, and your website stays live until then.</p>
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
