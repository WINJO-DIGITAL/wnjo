"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { staffStageLabel } from "@/lib/build-journey";
import { KIND_LABEL } from "@/lib/subscription-cancellation";
import {
  buildCustomers,
  customerTimeline,
  STATE_LABEL,
  viewCustomers,
  type BriefRow,
  type Customer,
  type CustomerFilter,
  type CustomerSort,
  type EnquiryRow,
  type Renewal,
  type SubRow,
} from "@/lib/portal/customers";

const money = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });
const day = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });
const date = (iso: string | null | undefined) => (iso ? day.format(new Date(iso)) : "");

/** The renewal as a short phrase: the date, or what is wrong with it. */
function renewalText(r: Renewal): string {
  const d = day.format(new Date(r.at));
  return r.kind === "overdue" ? `Overdue, due ${d}` : r.kind === "ends" ? `Ends ${d}` : d;
}

const SUB_STATUS: Record<string, string> = { offered: "Link sent", active: "Active", past_due: "Payment overdue", cancelled: "Ended", paid: "Paid", expired: "Expired" };
const FILTERS: { id: CustomerFilter; label: string }[] = [
  { id: "all", label: "Everyone" },
  { id: "active", label: "Active" },
  { id: "overdue", label: "Overdue" },
  { id: "awaiting_payment", label: "Waiting for payment" },
  { id: "lead", label: "Enquiries" },
  { id: "ended", label: "Ended" },
];

type Payment = { subscription_id: string; amount_pence: number; paid_at: string };
type SubEvent = { subscription_id: string; kind: string; reason: string; created_at: string };

/** The email of the customer named in the address (#customers/<email>), so a profile can be linked to and reloaded. */
function emailFromHash(): string | null {
  if (typeof window === "undefined") return null;
  const m = window.location.hash.match(/^#customers\/(.+)$/);
  return m ? decodeURIComponent(m[1]).toLowerCase() : null;
}

/**
 * Every customer in one place: who they are, where they stand and what they pay, with a profile behind each row.
 * It reads the same records the other sections do, under the same staff access rules, and changes nothing but notes.
 */
export function CustomersAdmin({ client, tenantId }: { client: SupabaseClient; tenantId: string }) {
  const [data, setData] = useState<{ customers: Customer[]; payments: Payment[]; events: SubEvent[] } | null>(null);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState<CustomerFilter>("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<CustomerSort>("recent");
  const [open, setOpen] = useState<string | null>(emailFromHash);

  useEffect(() => {
    const onHash = () => setOpen(emailFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      client
        .from("website_subscriptions")
        .select("id, reference, kind, status, name, business_name, email, package_code, package_name, setup_pence, monthly_pence, one_off_pence, payments_count, cancel_at_period_end, livemode, current_period_end, first_payment_at, last_payment_at, launched_at, created_at")
        .order("created_at", { ascending: false })
        .limit(1000),
      client.from("website_briefs").select("id, reference, email, name, business_name, stage, route, created_at, updated_at").order("created_at", { ascending: false }).limit(1000),
      client.from("enquiries").select("id, reference, kind, name, email, company, topic, created_at").order("created_at", { ascending: false }).limit(1000),
      client.from("website_subscription_payments").select("subscription_id, amount_pence, paid_at").order("paid_at", { ascending: false }).limit(1000),
      client.from("website_subscription_events").select("subscription_id, kind, reason, created_at").order("created_at", { ascending: false }).limit(500),
    ]).then(([subs, briefs, enquiries, payments, events]) => {
      if (cancelled) return;
      if (subs.error || briefs.error || enquiries.error) return setError(true);
      setData({
        customers: buildCustomers((subs.data as SubRow[]) ?? [], (briefs.data as BriefRow[]) ?? [], (enquiries.data as EnquiryRow[]) ?? []),
        payments: (payments.data as Payment[]) ?? [],
        events: (events.data as SubEvent[]) ?? [],
      });
    });
    return () => {
      cancelled = true;
    };
  }, [client]);

  const rows = useMemo(() => (data ? viewCustomers([...data.customers], { filter, search, sort }) : []), [data, filter, search, sort]);
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: data?.customers.length ?? 0 };
    for (const x of data?.customers ?? []) c[x.state] = (c[x.state] ?? 0) + 1;
    return c;
  }, [data]);

  if (error) return <p role="alert">Customers couldn&apos;t be loaded. Please refresh the page.</p>;
  if (!data) return <p className="lede">Loading…</p>;

  const chosen = open ? data.customers.find((c) => c.email === open) : null;
  if (open && chosen) {
    return <Profile client={client} tenantId={tenantId} customer={chosen} payments={data.payments} events={data.events} />;
  }

  return (
    <div className="cust">
      {open && !chosen && <p role="alert">We couldn&apos;t find a customer with that email. They are listed below once they get in touch.</p>}
      <div className="cust-tools">
        <label className="visually-hidden" htmlFor="cust-search">Search customers</label>
        <input id="cust-search" type="search" className="acct-input cust-search" placeholder="Search by name, business, email or reference" value={search} onChange={(e) => setSearch(e.target.value)} />
        <label className="visually-hidden" htmlFor="cust-sort">Sort by</label>
        <select id="cust-sort" className="acct-input cust-sort" value={sort} onChange={(e) => setSort(e.target.value as CustomerSort)}>
          <option value="recent">Latest activity</option>
          <option value="name">Name</option>
          <option value="monthly">Monthly payment</option>
          <option value="renewal">Renewal date</option>
        </select>
      </div>
      <div className="seg" role="group" aria-label="Show">
        {FILTERS.filter((f) => f.id === "all" || (counts[f.id] ?? 0) > 0).map((f) => (
          <button key={f.id} type="button" className="seg__item" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>
            {f.label} <span className="seg__count">{counts[f.id] ?? 0}</span>
          </button>
        ))}
      </div>

      {data.customers.length === 0 ? (
        <p className="lede">No customers yet. They appear here as soon as someone gets in touch or starts a plan.</p>
      ) : rows.length === 0 ? (
        <p className="lede">No one matches that. <button type="button" className="link-button" onClick={() => { setSearch(""); setFilter("all"); }}>Show everyone</button></p>
      ) : (
        <table className="admin-table admin-table--stack admin-table--list">
          <thead>
            <tr>
              <th scope="col">Customer</th><th scope="col">Plan</th><th scope="col" className="admin-table__num">Monthly</th><th scope="col">Renews</th><th scope="col">Status</th><th scope="col">Last activity</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => {
              const plan = c.subscriptions.find((s) => s.status === "active" || s.status === "past_due") ?? c.subscriptions[0];
              return (
                <tr key={c.email} className="admin-table__row">
                  <td data-label="Customer">
                    <a className="cust-name" href={`#customers/${encodeURIComponent(c.email)}`}>{c.business || c.name || c.email}</a>
                    <span className="cust-sub">{c.business && c.name ? `${c.name} · ${c.email}` : c.business || c.name ? c.email : ""}</span>
                  </td>
                  <td data-label="Plan">{plan ? plan.package_name : c.briefs[0] ? "Website in progress" : "None yet"}</td>
                  <td data-label="Monthly" className="admin-table__num">{c.monthlyPence > 0 ? money.format(c.monthlyPence / 100) : "–"}</td>
                  <td data-label="Renews">{c.renewal ? <span className={`renewal renewal--${c.renewal.kind}`}>{renewalText(c.renewal)}</span> : "–"}</td>
                  <td data-label="Status"><span className={`state state--${c.state}`}>{STATE_LABEL[c.state]}</span></td>
                  <td data-label="Last activity">{date(c.lastActivity)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

type Note = { id: string; body: string; author_email: string; created_at: string };

function Profile({ client, tenantId, customer: c, payments, events }: { client: SupabaseClient; tenantId: string; customer: Customer; payments: Payment[]; events: SubEvent[] }) {
  const ids = new Set(c.subscriptions.map((s) => s.id));
  const mine = payments.filter((p) => ids.has(p.subscription_id));
  const paidTotal = mine.reduce((sum, p) => sum + p.amount_pence, 0);
  const timeline = customerTimeline(c, { payments: mine, events: events.filter((e) => ids.has(e.subscription_id)), eventLabel: (k) => KIND_LABEL[k as keyof typeof KIND_LABEL] ?? k });
  const nextPayment = c.subscriptions
    .filter((s) => s.livemode !== false && s.kind === "subscription" && s.status === "active" && !s.cancel_at_period_end && s.current_period_end)
    .map((s) => s.current_period_end as string)
    .sort()[0];

  return (
    <div className="cust-profile">
      <a className="back-link" href="#customers">← All customers</a>
      <header className="cust-head">
        <div>
          <h2 className="cust-head__name">{c.business || c.name || c.email}</h2>
          <p className="cust-head__who">
            {c.business && c.name ? `${c.name} · ` : ""}
            <a href={`mailto:${c.email}`}>{c.email}</a>
          </p>
        </div>
        <span className={`state state--${c.state}`}>{STATE_LABEL[c.state]}</span>
      </header>

      <dl className="figures">
        <div><dt>Monthly</dt><dd>{c.monthlyPence > 0 ? money.format(c.monthlyPence / 100) : "–"}</dd></div>
        <div><dt>Next payment</dt><dd>{nextPayment ? date(nextPayment) : "–"}</dd></div>
        <div><dt>Paid to date</dt><dd>{paidTotal > 0 ? money.format(paidTotal / 100) : "–"}</dd></div>
        <div><dt>Customer since</dt><dd>{date(c.since) || "–"}</dd></div>
      </dl>

      <div className="cust-cols">
        <div className="cust-main">
          <section aria-labelledby="cust-plans">
            <h3 id="cust-plans" className="admin-label">Plans</h3>
            {c.subscriptions.length === 0 ? (
              <p className="acct-meta">No plan yet.</p>
            ) : (
              <table className="admin-table admin-table--stack">
                <thead><tr><th scope="col">Reference</th><th scope="col">Plan</th><th scope="col">Status</th><th scope="col" className="admin-table__num">Price</th><th scope="col">Payments</th></tr></thead>
                <tbody>
                  {c.subscriptions.map((s) => (
                    <tr key={s.id}>
                      <td data-label="Reference">{s.reference}{s.livemode === false && <span className="acct-meta"> (test)</span>}</td>
                      <td data-label="Plan">{s.package_name}</td>
                      <td data-label="Status">
                        {SUB_STATUS[s.status] ?? s.status}
                        {s.cancel_at_period_end && s.current_period_end ? `, ends ${date(s.current_period_end)}` : s.cancel_at_period_end ? ", ending" : ""}
                      </td>
                      <td data-label="Price" className="admin-table__num">{s.kind === "subscription" ? `${money.format(s.monthly_pence / 100)} a month` : `${money.format(s.one_off_pence / 100)} once`}</td>
                      <td data-label="Payments">{s.payments_count > 0 ? `${s.payments_count}${s.last_payment_at ? `, last ${date(s.last_payment_at)}` : ""}` : "None yet"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {c.subscriptions.length > 0 && <p className="cust-more"><a href="#subscriptions">Change a price or end a plan in Subscriptions →</a></p>}
          </section>

          <section aria-labelledby="cust-sites">
            <h3 id="cust-sites" className="admin-label">Websites</h3>
            {c.briefs.length === 0 ? (
              <p className="acct-meta">No website in progress.</p>
            ) : (
              <table className="admin-table admin-table--stack">
                <thead><tr><th scope="col">Website</th><th scope="col">Reference</th><th scope="col">Stage</th><th scope="col">Started</th></tr></thead>
                <tbody>
                  {c.briefs.map((b) => (
                    <tr key={b.id}>
                      <td data-label="Website">{b.business_name || "Untitled"}</td>
                      <td data-label="Reference">{b.reference}</td>
                      <td data-label="Stage">{staffStageLabel(b.stage as Parameters<typeof staffStageLabel>[0])}</td>
                      <td data-label="Started">{date(b.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {c.briefs.length > 0 && <p className="cust-more"><a href="#builds">Open in Website builds →</a></p>}
          </section>

          <section aria-labelledby="cust-timeline">
            <h3 id="cust-timeline" className="admin-label">Activity</h3>
            {timeline.length === 0 ? (
              <p className="acct-meta">Nothing yet.</p>
            ) : (
              <ol className="timeline">
                {timeline.slice(0, 40).map((t, i) => (
                  <li key={i}>
                    <span className="timeline__when">{date(t.at)}</span>
                    <span className="timeline__what">{t.title}</span>
                    {t.detail && <span className="timeline__detail">{t.detail}</span>}
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        <Notes client={client} tenantId={tenantId} email={c.email} />
      </div>
    </div>
  );
}

/** Internal notes on a customer. Staff only, by database rule: a customer can never read them. Notes are a record, so they are added, not edited. */
function Notes({ client, tenantId, email }: { client: SupabaseClient; tenantId: string; email: string }) {
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () =>
    client
      .from("customer_notes")
      .select("id, body, author_email, created_at")
      .eq("customer_email", email)
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data, error: err }) => {
        setFailed(Boolean(err));
        setNotes(err ? [] : ((data as Note[]) ?? []));
      });
  useEffect(() => {
    void load();
    // Reloads when the customer changes; load reads the email it was given.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, email]);

  const add = async (event: FormEvent) => {
    event.preventDefault();
    const body = text.trim();
    if (!body) return;
    setBusy(true);
    setError(null);
    const { error: err } = await client.from("customer_notes").insert({ tenant_id: tenantId, customer_email: email, body });
    setBusy(false);
    if (err) return setError("The note wasn't saved. Please try again.");
    setText("");
    void load();
  };

  return (
    <aside className="notes" aria-labelledby="cust-notes">
      <h3 id="cust-notes" className="admin-label">Internal notes</h3>
      <p className="acct-meta">Only your team sees these.</p>
      <form onSubmit={add} className="notes__form">
        <label className="visually-hidden" htmlFor="note-text">Add a note</label>
        <textarea id="note-text" className="acct-input notes__input" rows={3} maxLength={2000} placeholder="Add a note" value={text} onChange={(e) => setText(e.target.value)} />
        <button type="submit" className="btn btn--secondary btn--sm" disabled={busy || !text.trim()}>{busy ? "Saving…" : "Save note"}</button>
        {error && <p role="alert" className="acct-error">{error}</p>}
      </form>
      {failed && <p role="alert">Notes couldn&apos;t be loaded.</p>}
      {notes === null ? (
        <p className="acct-meta">Loading…</p>
      ) : (
        notes.length > 0 && (
          <ol className="notes__list">
            {notes.map((n) => (
              <li key={n.id}>
                <p className="notes__body">{n.body}</p>
                <p className="acct-meta">{n.author_email || "Staff"} · {date(n.created_at)}</p>
              </li>
            ))}
          </ol>
        )
      )}
    </aside>
  );
}
