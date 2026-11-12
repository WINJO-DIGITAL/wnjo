"use client";

import { KIND_LABEL } from "@/lib/subscription-cancellation";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { monthlyRecurringPence } from "@/lib/website-subscription-figures";

type Row = {
  id: string;
  reference: string;
  kind: "subscription" | "one_off";
  status: string;
  name: string;
  business_name: string | null;
  email: string;
  package_name: string;
  setup_pence: number;
  monthly_pence: number;
  one_off_pence: number;
  payments_count: number;
  ownership_after_payments: number;
  ownership_eligible_at: string | null;
  cancel_at_period_end: boolean;
  livemode: boolean | null;
  created_at: string;
};

const money = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });
const when = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });
const STATUS: Record<string, string> = {
  offered: "Link sent",
  active: "Active",
  past_due: "Payment overdue",
  cancelled: "Ended",
  paid: "Paid",
  expired: "Expired",
};

/**
 * Website subscriptions for staff: monthly recurring revenue, each subscription's payments towards ownership, and the
 * actions that change money (payment links, price changes, cancellation), all through the server.
 */
export function SubscriptionsAdmin({ client }: { client: SupabaseClient }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState(false);
  const [requests, setRequests] = useState<Record<string, { reason: string; created_at: string }>>({});
  const [history, setHistory] = useState<{ kind: string; reason: string; created_at: string; reference: string; name: string }[] | null>(null);

  const load = useCallback(() => {
    // Customers who have asked to cancel on their account and are waiting for staff.
    client
      .from("website_cancellation_requests")
      .select("subscription_id, reason, created_at")
      .eq("status", "open")
      .then(({ data }) => {
        const map: Record<string, { reason: string; created_at: string }> = {};
        for (const r of (data as { subscription_id: string; reason: string; created_at: string }[]) ?? []) map[r.subscription_id] = { reason: r.reason, created_at: r.created_at };
        setRequests(map);
      });
    // Cancellation history: what Stripe told us, newest first. Written by the webhook only; this only reads.
    client
      .from("website_subscription_events")
      .select("kind, reason, created_at, website_subscriptions(reference, name)")
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setHistory(
          ((data as unknown as { kind: string; reason: string; created_at: string; website_subscriptions: { reference: string; name: string } | null }[]) ?? []).map((e) => ({
            kind: e.kind,
            reason: e.reason,
            created_at: e.created_at,
            reference: e.website_subscriptions?.reference ?? "",
            name: e.website_subscriptions?.name ?? "",
          })),
        );
      });
    client
      .from("website_subscriptions")
      .select("id, reference, kind, status, name, business_name, email, package_name, setup_pence, monthly_pence, one_off_pence, payments_count, ownership_after_payments, ownership_eligible_at, cancel_at_period_end, livemode, created_at")
      .order("created_at", { ascending: false })
      .limit(200)
      .then(({ data, error: err }) => {
        setError(Boolean(err));
        setRows(err ? null : ((data as Row[]) ?? []));
      });
  }, [client]);
  useEffect(load, [load]);

  const call = async (payload: Record<string, unknown>) => {
    const { data } = await client.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return { ok: false, json: { error: "sign_in" } };
    const res = await fetch("/api/admin/subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    return { ok: res.ok, json: (await res.json().catch(() => ({}))) as Record<string, unknown> };
  };

  if (error) return <p role="alert">Subscriptions couldn&apos;t be loaded.</p>;
  if (rows === null) return <p className="lede">Loading…</p>;

  const live = rows.filter((r) => r.livemode !== false);
  const mrr = monthlyRecurringPence(live);
  const active = live.filter((r) => r.kind === "subscription" && (r.status === "active" || r.status === "past_due")).length;
  const setupCollected = live.filter((r) => r.payments_count > 0).reduce((s, r) => s + r.setup_pence, 0);

  return (
    <div className="stack" style={{ "--stack": "var(--space-6)" } as React.CSSProperties}>
      <section aria-label="Cancellation history">
        <p className="admin-label">Cancellations and failed payments</p>
        {history === null ? (
          <p className="acct-meta">Loading…</p>
        ) : history.length === 0 ? (
          <p className="acct-meta">Nothing has been cancelled or failed yet.</p>
        ) : (
          <ul className="build-revisions" role="list">
            {history.map((e, i) => (
              <li key={i}>
                <p className="build-revision__head">
                  <strong>{KIND_LABEL[e.kind as keyof typeof KIND_LABEL] ?? e.kind}</strong>
                  <span className="acct-meta">{e.reference} · {e.name}</span>
                  <span className="acct-meta">{new Date(e.created_at).toLocaleDateString("en-GB")}</span>
                </p>
                {e.reason && <p className="acct-meta">{e.reason}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
      <div className="dash-stats">
        <div className="dash-stat"><span className="dash-stat__label">Monthly recurring revenue</span><span className="dash-stat__value">{money.format(mrr / 100)}</span><span className="dash-stat__note">Active and overdue</span></div>
        <div className="dash-stat"><span className="dash-stat__label">Active subscriptions</span><span className="dash-stat__value">{active}</span><span className="dash-stat__note">Website packages</span></div>
        <div className="dash-stat"><span className="dash-stat__label">Setup fees collected</span><span className="dash-stat__value">{money.format(setupCollected / 100)}</span><span className="dash-stat__note">All time</span></div>
      </div>
      <CreateLink call={call} onCreated={load} />
      {rows.length === 0 ? (
        <p className="lede">No website subscriptions yet.</p>
      ) : (
        <table className="admin-table admin-table--subs">
          <thead>
            <tr>
              <th scope="col">Reference</th><th scope="col">Customer</th><th scope="col">Package</th><th scope="col">Status</th>
              <th scope="col">Monthly</th><th scope="col">Towards ownership</th><th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>
                  {r.reference}
                  {r.livemode === false && <span className="acct-meta"> (test)</span>}
                </td>
                <td>{r.business_name || r.name}<br /><a href={`mailto:${r.email}`} className="acct-meta">{r.email}</a></td>
                <td>{r.package_name}</td>
                <td>
                  {STATUS[r.status] ?? r.status}
                  {r.cancel_at_period_end ? ", ending" : ""}
                  {requests[r.id] && (
                    <>
                      <br />
                      <strong>Cancel requested</strong> <span className="acct-meta">{new Date(requests[r.id].created_at).toLocaleDateString("en-GB")}{requests[r.id].reason ? ` · ${requests[r.id].reason}` : ""}</span>
                    </>
                  )}
                </td>
                <td>{r.kind === "subscription" ? money.format(r.monthly_pence / 100) : money.format(r.one_off_pence / 100) + " once"}</td>
                <td>
                  {r.kind === "subscription"
                    ? r.ownership_eligible_at
                      ? `Due since ${when.format(new Date(r.ownership_eligible_at))}`
                      : r.ownership_after_payments > 0
                        ? `${r.payments_count} of ${r.ownership_after_payments}`
                        : "Not applicable (rolling)"
                    : "On full payment"}
                </td>
                <td>{r.kind === "subscription" && (r.status === "active" || r.status === "past_due") ? <Manage row={r} call={call} onDone={load} /> : <span className="acct-meta">—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

type Call = (payload: Record<string, unknown>) => Promise<{ ok: boolean; json: Record<string, unknown> }>;

function CreateLink({ call, onCreated }: { call: Call; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <div className="admin-sub-open">
        <button type="button" className="btn btn--secondary" onClick={() => setOpen(true)}>Create a payment link</button>
      </div>
    );
  }
  return <CreateLinkForm call={call} onCreated={onCreated} />;
}

function CreateLinkForm({ call, onCreated }: { call: Call; onCreated: () => void }) {
  const [reference, setReference] = useState("");
  const [setup, setSetup] = useState("");
  const [monthly, setMonthly] = useState("");
  const [oneOff, setOneOff] = useState("");
  const [send, setSend] = useState(true);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ kind: "ok" | "error"; text: string; link?: string } | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    const n = (v: string) => (v.trim() === "" ? undefined : Number(v));
    const { ok, json } = await call({
      action: "create",
      enquiryReference: reference.trim().toUpperCase(),
      overrides: { setup: n(setup), monthly: n(monthly), oneOff: n(oneOff) },
      sendEmail: send,
    });
    setBusy(false);
    if (ok) {
      setResult({ kind: "ok", text: `Created ${json.reference as string}${json.emailed ? " and emailed to the customer" : ""}. Copy the link now: it isn't shown again.`, link: json.link as string });
      onCreated();
    } else {
      setResult({
        kind: "error",
        text: json.error === "not_a_website_quote" ? "That reference isn't a website quote from the calculator." : "The link couldn't be created. Check the reference and try again.",
      });
    }
  };

  return (
    <form onSubmit={submit} className="acct-form admin-sub-form">
      <h2 className="h3">Create a payment link</h2>
      <p className="acct-meta">Once the written proposal is agreed. Leave the figures blank to use the calculator&apos;s; change them to match the proposal.</p>
      <label className="acct-label" htmlFor="sub-ref">Quote reference</label>
      <input id="sub-ref" className="acct-input" required placeholder="WNJO-1A2B3C" value={reference} onChange={(e) => setReference(e.target.value)} />
      <div className="admin-sub-figures">
        <label className="acct-label">Setup (£)<input className="acct-input" inputMode="decimal" value={setup} onChange={(e) => setSetup(e.target.value)} /></label>
        <label className="acct-label">Monthly (£)<input className="acct-input" inputMode="decimal" value={monthly} onChange={(e) => setMonthly(e.target.value)} /></label>
        <label className="acct-label">One-off (£)<input className="acct-input" inputMode="decimal" value={oneOff} onChange={(e) => setOneOff(e.target.value)} /></label>
      </div>
      <label className="acct-check"><input type="checkbox" checked={send} onChange={(e) => setSend(e.target.checked)} /> Email the link to the customer</label>
      <button type="submit" className="btn btn--primary" disabled={busy}>{busy ? "Creating…" : "Create link"}</button>
      {result && (
        <p role={result.kind === "error" ? "alert" : "status"}>
          {result.text}
          {result.link && (<><br /><code className="admin-sub-link">{result.link}</code></>)}
        </p>
      )}
    </form>
  );
}

function Manage({ row, call, onDone }: { row: Row; call: Call; onDone: () => void }) {
  const [price, setPrice] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const change = async () => {
    const monthly = Number(price);
    if (!Number.isFinite(monthly) || monthly <= 0) return setNote("Enter the new monthly price in pounds.");
    const { ok } = await call({ action: "change_price", id: row.id, monthly });
    setNote(ok ? `Monthly price changes to £${monthly} from the next invoice.` : "The price couldn't be changed.");
    if (ok) onDone();
  };
  const cancel = async () => {
    const { ok } = await call({ action: "cancel", id: row.id });
    setNote(ok ? "It will end at the end of the current period." : "It couldn't be cancelled.");
    setConfirmCancel(false);
    if (ok) onDone();
  };
  return (
    <div className="admin-sub-manage">
      <input className="acct-input" inputMode="decimal" placeholder="New £/month" aria-label={`New monthly price for ${row.reference}`} value={price} onChange={(e) => setPrice(e.target.value)} />
      <button type="button" className="btn btn--secondary btn--sm" onClick={change}>Change price</button>
      {!row.cancel_at_period_end &&
        (confirmCancel ? (
          <button type="button" className="btn btn--secondary btn--sm" onClick={cancel}>Confirm: end at period end</button>
        ) : (
          <button type="button" className="btn btn--secondary btn--sm" onClick={() => setConfirmCancel(true)}>Cancel</button>
        ))}
      {note && <p className="acct-meta" role="status">{note}</p>}
    </div>
  );
}
