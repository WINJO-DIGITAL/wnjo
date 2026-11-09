"use client";

import { isTestRecord } from "@/lib/test-records";
import { useEffect, useState, type FormEvent } from "react";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { ProjectsAdmin } from "./ProjectsAdmin";
import { AiStatus } from "./AiStatus";
import { SubscriptionsAdmin } from "./SubscriptionsAdmin";
import { BuildsAdmin } from "./BuildsAdmin";
import { Confirmation } from "@/components/account/Confirmation";
import { sendQueuedEmails } from "@/lib/notify-client";

type Membership = { tenant_id: string; role: "owner" | "admin" | "staff" };
type Enquiry = { id: string; reference: string; kind: string; name: string; email: string; topic: string | null; created_at: string; answers: unknown };
type QuoteRow = { id: string; reference: string; status: string; created_at: string; expires_at: string | null; quote_versions: { version: number; range_high_pence: number; range_low_pence: number }[] };
type OrderRow = { id: string; business_name: string; project_type: string; stage: string; created_at: string };
type ApprovalRow = {
  id: string;
  title: string;
  kind: string;
  status: string;
  created_at: string;
  decided_at: string | null;
  projects: { name: string } | null;
  approval_responses: { decision: string; responder_email: string; comment: string; created_at: string }[];
};

const approvalStatus: Record<string, string> = {
  open: "Waiting for client",
  approved: "Approved",
  changes_requested: "Changes requested",
  withdrawn: "Withdrawn",
};

const money = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });
const when = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });

type Tab = "overview" | "enquiries" | "builds" | "quotes" | "subscriptions" | "orders" | "approvals" | "projects" | "ai";

const TABS: Tab[] = ["overview", "enquiries", "builds", "quotes", "subscriptions", "orders", "approvals", "projects", "ai"];
const TAB_INFO: Record<Tab, { group: string; title: string }> = {
  overview: { group: "Overview", title: "Today" },
  enquiries: { group: "Sales", title: "Enquiries" },
  builds: { group: "Sales", title: "Website builds" },
  quotes: { group: "Sales", title: "Quotes" },
  subscriptions: { group: "Sales", title: "Website subscriptions" },
  orders: { group: "Delivery", title: "Orders" },
  projects: { group: "Delivery", title: "Projects" },
  approvals: { group: "Delivery", title: "Approvals" },
  ai: { group: "Studio", title: "AI agents" },
};

/** The section named in the address hash (set by the dashboard menu), or the overview. */
function tabFromHash(): Tab {
  if (typeof window === "undefined") return "overview";
  const hash = window.location.hash.replace("#", "") as Tab;
  return TABS.includes(hash) ? hash : "overview";
}

/**
 * The agency's read-only control area for this step. Every query is limited by row-level security, so
 * a signed-in person sees only what their agency role allows. Anyone else sees a refusal.
 */
export function AdminView() {
  const client = supabase();
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [membership, setMembership] = useState<Membership | null | "loading">("loading");
  const [tab, setTab] = useState<Tab>(tabFromHash);

  // The dashboard menu changes the hash; follow it.
  useEffect(() => {
    const onHash = () => setTab(tabFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);

  useEffect(() => {
    if (!client) return;
    client.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = client.auth.onAuthStateChange((_e, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, [client]);

  const userId = session?.user.id;
  useEffect(() => {
    if (!client || !userId) return;
    let cancelled = false;
    // An empty answer can come back before the sign-in has settled, so ask once more before saying "no access".
    const look = async (attempt: number) => {
      const { data } = await client.from("tenant_members").select("tenant_id, role").eq("user_id", userId);
      if (cancelled) return;
      const first = (data as Membership[] | null)?.[0];
      if (first) setMembership(first);
      else if (attempt === 0) setTimeout(() => void look(1), 700);
      else setMembership(null);
    };
    void look(0);
    return () => {
      cancelled = true;
    };
  }, [client, userId]);

  if (!client) return <p className="lede">The admin area isn&apos;t switched on yet.</p>;
  if (session === undefined) return <p className="lede">Checking your access…</p>;
  if (!session) return <SignIn client={client} />;
  if (membership === "loading") return <p className="lede">Checking your access…</p>;
  if (!membership) {
    return (
      <div className="admin-noaccess">
        <p className="lede">You don&apos;t have access to the agency admin.</p>
        <button type="button" className="btn btn--secondary" onClick={() => client.auth.signOut()}>
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="admin">
      <div className="dash-page__head">
        <h1 className="dash-title">{TAB_INFO[tab].title}</h1>
      </div>
      {tab === "overview" && <StaffOverview client={client} />}
      {tab === "enquiries" && <EnquiriesTable client={client} />}
      {tab === "quotes" && <QuotesTable client={client} />}
      {tab === "builds" && <BuildsAdmin client={client} />}
      {tab === "subscriptions" && <SubscriptionsAdmin client={client} />}
      {tab === "orders" && (
        <>
          <OrdersTable client={client} selectedId={selectedOrder} onSelect={setSelectedOrder} />
          {selectedOrder && (
            <OrderManager key={selectedOrder} client={client} tenantId={membership.tenant_id} orderId={selectedOrder} />
          )}
          <InvitesPanel client={client} tenantId={membership.tenant_id} />
        </>
      )}
      {tab === "approvals" && <ApprovalsTable client={client} />}
      {tab === "ai" && <AiStatus client={client} />}
      {tab === "projects" && <ProjectsAdmin client={client} tenantId={membership.tenant_id} userId={session.user.id} />}
    </div>
  );
}

type Stat = { label: string; value: string; href: string; note: string };

/** The staff home: four figures that matter today, each a link to the section behind it. */
function StaffOverview({ client }: { client: SupabaseClient }) {
  const [stats, setStats] = useState<Stat[] | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
    Promise.all([
      client.from("enquiries").select("id", { count: "exact", head: true }).gte("created_at", weekAgo),
      client.from("quotes").select("id", { count: "exact", head: true }).eq("status", "sent"),
      client.from("orders").select("id", { count: "exact", head: true }).neq("stage", "live"),
      client.from("deposits").select("amount_pence, quote_acceptance_id").eq("status", "paid"),
    ]).then(([enq, quotes, orders, deposits]) => {
      if (enq.error || quotes.error || orders.error || deposits.error) {
        setError(true);
        return;
      }
      const paid = ((deposits.data as { amount_pence: number; quote_acceptance_id: string }[]) ?? [])
        .filter((d) => !isTestRecord(d.quote_acceptance_id))
        .reduce((sum, d) => sum + d.amount_pence, 0);
      setStats([
        { label: "New enquiries", value: String(enq.count ?? 0), href: "#enquiries", note: "Last 7 days" },
        { label: "Quotes waiting", value: String(quotes.count ?? 0), href: "#quotes", note: "Sent, not yet answered" },
        { label: "Orders in progress", value: String(orders.count ?? 0), href: "#orders", note: "Not live yet" },
        { label: "Deposits received", value: money.format(paid / 100), href: "#orders", note: "All time" },
      ]);
    });
  }, [client]);
  if (error) return <p role="alert">The overview couldn&apos;t be loaded.</p>;
  if (!stats) return <p className="lede">Loading…</p>;
  return (
    <div className="dash-stats">
      {stats.map((s) => (
        <a key={s.label} href={s.href} className="dash-stat">
          <span className="dash-stat__label">{s.label}</span>
          <span className="dash-stat__value">{s.value}</span>
          <span className="dash-stat__note">{s.note}</span>
        </a>
      ))}
    </div>
  );
}

function SignIn({ client }: { client: SupabaseClient }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const { error: err } = await client.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/admin` },
    });
    setError(Boolean(err));
    setSent(!err);
  };
  return (
    <form onSubmit={submit} className="acct-form">
      <label htmlFor="admin-email" className="acct-label">Staff email address</label>
      <input id="admin-email" type="email" required className="acct-input" value={email} onChange={(e) => setEmail(e.target.value)} />
      <button type="submit" className="btn btn--primary">Email me a sign-in link</button>
      {sent && <p role="status">Check your inbox for the sign-in link.</p>}
      {error && <p role="alert">We couldn&apos;t send the link. Please try again.</p>}
    </form>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="lede">{text}</p>;
}

function EnquiriesTable({ client }: { client: SupabaseClient }) {
  const [rows, setRows] = useState<Enquiry[] | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    client
      .from("enquiries")
      .select("id, reference, kind, name, email, topic, created_at, answers")
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data, error: err }) => {
        setError(Boolean(err));
        setRows(err ? null : ((data as Enquiry[]) ?? []));
      });
  }, [client]);
  if (error) return <p role="alert">Enquiries couldn&apos;t be loaded.</p>;
  if (rows === null) return <p className="lede">Loading…</p>;
  if (rows.length === 0) return <Empty text="No enquiries yet." />;
  return (
    <table className="admin-table">
      <thead><tr><th scope="col">Received</th><th scope="col">Reference</th><th scope="col">Name</th><th scope="col">Type</th><th scope="col">Email</th><th scope="col">Quote</th></tr></thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id}>
            <td>{when.format(new Date(r.created_at))}</td>
            <td>{r.reference}</td>
            <td>{r.name}</td>
            <td>{(r.answers as { type?: string } | null)?.type === "website" ? r.topic ?? "Website quote" : r.kind === "brief" ? "Brief" : "Contact"}</td>
            <td><a href={`mailto:${r.email}`}>{r.email}</a></td>
            <td>{(r.answers as { type?: string } | null)?.type === "website" ? <a href="#subscriptions" className="acct-meta">Payment link: Subscriptions</a> : r.kind === "brief" && r.answers ? <QuoteFromBrief client={client} enquiryId={r.id} /> : <span className="acct-meta">—</span>}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * Prices a brief on the server and issues the quote. The client organisation is optional: a quote with none is kept
 * internal until the client is linked. The price is never typed in here.
 */
function QuoteFromBrief({ client, enquiryId }: { client: SupabaseClient; enquiryId: string }) {
  const [open, setOpen] = useState(false);
  const [orgs, setOrgs] = useState<Array<{ id: string; name: string }> | null>(null);
  const [orgId, setOrgId] = useState("");
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const openPanel = () => {
    setOpen(true);
    if (orgs === null) {
      client
        .from("organizations")
        .select("id, name")
        .order("name")
        .then(({ data }) => setOrgs(((data as Array<{ id: string; name: string }>) ?? [])));
    }
  };

  const issue = async () => {
    setBusy(true);
    setNote(null);
    const { data } = await client.auth.getSession();
    const token = data.session?.access_token;
    const auth = { "content-type": "application/json", authorization: `Bearer ${token ?? ""}` };
    let organizationId: string | null = orgId || null;
    let invited = false;
    if (newName.trim() || newEmail.trim()) {
      // A new client: create their organisation and invite their email first, so the quote can be shown to them.
      const res = token ? await fetch("/api/admin/clients", { method: "POST", headers: auth, body: JSON.stringify({ name: newName, email: newEmail }) }) : null;
      const body = res ? ((await res.json().catch(() => null)) as { organizationId?: string; reason?: string } | null) : null;
      if (!res?.ok || !body?.organizationId) {
        setBusy(false);
        setNote({ kind: "error", text: body?.reason ?? "The new client couldn't be added. Please try again." });
        return;
      }
      organizationId = body.organizationId;
      invited = true;
    }
    const res = token
      ? await fetch("/api/admin/quotes", { method: "POST", headers: auth, body: JSON.stringify({ enquiryId, organizationId }) })
      : null;
    setBusy(false);
    const body = res ? ((await res.json().catch(() => null)) as { reference?: string; reason?: string } | null) : null;
    if (res?.ok && body?.reference) {
      const tail = invited ? ` ${newEmail.trim()} has been invited and will see it when they sign in.` : organizationId ? "" : " It is internal until a client is linked.";
      setNote({ kind: "ok", text: `Quote ${body.reference} issued.${tail}` });
      setOpen(false);
    } else {
      setNote({ kind: "error", text: body?.reason ?? "The quote couldn't be issued. Please try again." });
    }
  };

  if (!open) {
    return (
      <span>
        <button type="button" className="btn btn--secondary" onClick={openPanel}>Create quote</button>
        {note && <span role="status" className="acct-meta"> {note.text}</span>}
      </span>
    );
  }
  return (
    <span className="admin-stack">
      <label className="acct-meta">
        Client organisation
        <select className="acct-input" value={orgId} onChange={(e) => setOrgId(e.target.value)}>
          <option value="">None yet (keep internal)</option>
          {(orgs ?? []).map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
      </label>
      <label className="acct-meta">
        Or a new client: business name
        <input className="acct-input" value={newName} onChange={(e) => setNewName(e.target.value)} />
      </label>
      <label className="acct-meta">
        Their email (they sign in with this to see the quote)
        <input className="acct-input" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
      </label>
      <span className="admin-actions">
        <button type="button" className="btn btn--primary" disabled={busy} onClick={issue}>{busy ? "Pricing…" : "Issue quote"}</button>
        <button type="button" className="btn btn--secondary" onClick={() => setOpen(false)}>Cancel</button>
      </span>
      {note && note.kind === "error" && <span role="alert">{note.text}</span>}
    </span>
  );
}

type PaymentState = { acceptanceId: string; depositPaid: boolean; balance: "none" | "requested" | "paid" };

function QuotesTable({ client }: { client: SupabaseClient }) {
  const [rows, setRows] = useState<QuoteRow[] | null>(null);
  const [payments, setPayments] = useState<Record<string, PaymentState>>({});
  const [error, setError] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    Promise.all([
      client
        .from("quotes")
        .select("id, reference, status, created_at, expires_at, quote_versions(version, range_low_pence, range_high_pence)")
        .order("created_at", { ascending: false })
        .limit(100),
      client.from("quote_acceptances").select("id, quote_id"),
      client.from("deposits").select("quote_acceptance_id, kind, status"),
    ]).then(([q, a, d]) => {
      setError(Boolean(q.error));
      setRows(q.error ? null : (((q.data as unknown as QuoteRow[]) ?? []).filter((r) => !isTestRecord(r.id))));
      const deposits = ((d.data as unknown as Array<{ quote_acceptance_id: string; kind: string; status: string }>) ?? []).filter(
        (x) => !isTestRecord(x.quote_acceptance_id),
      );
      const map: Record<string, PaymentState> = {};
      for (const acc of ((a.data as unknown as Array<{ id: string; quote_id: string }>) ?? [])) {
        const mine = deposits.filter((x) => x.quote_acceptance_id === acc.id);
        const balance = mine.find((x) => x.kind === "balance");
        map[acc.quote_id] = {
          acceptanceId: acc.id,
          depositPaid: mine.some((x) => x.kind === "deposit" && x.status === "paid"),
          balance: !balance ? "none" : balance.status === "paid" ? "paid" : "requested",
        };
      }
      setPayments(map);
    });
  }, [client, refresh]);

  /** Staff request the balance once the deposit is in. The server records it and tells the client. */
  const requestBalance = async (quoteId: string, acceptanceId: string) => {
    setBusy(quoteId);
    setNote(null);
    const { data } = await client.auth.getSession();
    const token = data.session?.access_token;
    const res = token
      ? await fetch("/api/admin/balance", {
          method: "POST",
          headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
          body: JSON.stringify({ acceptanceId }),
        })
      : null;
    setBusy(null);
    const body = res ? ((await res.json().catch(() => null)) as { amountPence?: number; error?: string } | null) : null;
    if (res?.ok && body?.amountPence) {
      setNote(`Balance requested: ${money.format(body.amountPence / 100)}. The client has been told.`);
      setRefresh((r) => r + 1);
    } else {
      setNote(body?.error === "deposit_not_paid" ? "The deposit hasn't been paid yet." : "The balance couldn't be requested. Please try again.");
    }
  };

  if (error) return <p role="alert">Quotes couldn&apos;t be loaded.</p>;
  if (rows === null) return <p className="lede">Loading…</p>;
  if (rows.length === 0) return <Empty text="No quotes yet." />;
  return (
    <>
      {note && <p role="status" className="acct-meta">{note}</p>}
      <table className="admin-table">
        <thead><tr><th scope="col">Issued</th><th scope="col">Reference</th><th scope="col">Status</th><th scope="col">Range</th><th scope="col">Expires</th><th scope="col">Payment</th></tr></thead>
        <tbody>
          {rows.map((r) => {
            const latest = r.quote_versions[r.quote_versions.length - 1];
            const pay = payments[r.id];
            return (
              <tr key={r.id}>
                <td>{when.format(new Date(r.created_at))}</td>
                <td>{r.reference}</td>
                <td>{r.status}</td>
                <td>{latest ? `${money.format(latest.range_low_pence / 100)} to ${money.format(latest.range_high_pence / 100)}` : "-"}</td>
                <td>{r.expires_at ? when.format(new Date(r.expires_at)) : "-"}</td>
                <td>
                  {!pay ? <span className="acct-meta">Not accepted</span>
                    : pay.balance === "paid" ? <span className="acct-meta">Settled</span>
                    : pay.balance === "requested" ? <span className="acct-meta">Balance requested</span>
                    : pay.depositPaid ? (
                      <button type="button" className="btn btn--secondary" disabled={busy === r.id} onClick={() => requestBalance(r.id, pay.acceptanceId)}>
                        Request balance
                      </button>
                    ) : <span className="acct-meta">Awaiting deposit</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}

function ApprovalsTable({ client }: { client: SupabaseClient }) {
  const [rows, setRows] = useState<ApprovalRow[] | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    client
      .from("approval_requests")
      .select(
        "id, title, kind, status, created_at, decided_at, projects(name), approval_responses(decision, responder_email, comment, created_at)",
      )
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data, error: err }) => {
        setError(Boolean(err));
        setRows(err ? null : ((data as unknown as ApprovalRow[]) ?? []));
      });
  }, [client]);
  if (error) return <p role="alert">Approvals couldn&apos;t be loaded.</p>;
  if (rows === null) return <p className="lede">Loading…</p>;
  if (rows.length === 0) return <Empty text="No approval requests yet." />;
  return (
    <table className="admin-table">
      <thead><tr><th scope="col">Requested</th><th scope="col">Project</th><th scope="col">Item</th><th scope="col">Status</th><th scope="col">Client response</th></tr></thead>
      <tbody>
        {rows.map((r) => {
          const response = r.approval_responses[0];
          return (
            <tr key={r.id}>
              <td>{when.format(new Date(r.created_at))}</td>
              <td>{r.projects?.name ?? "-"}</td>
              <td>{r.title} <span className="acct-meta">({r.kind})</span></td>
              <td>{approvalStatus[r.status] ?? r.status}</td>
              <td>
                {response
                  ? `${response.decision === "approve" ? "Approved" : "Asked for changes"} by ${response.responder_email} on ${when.format(new Date(response.created_at))}${response.comment ? `: "${response.comment}"` : ""}`
                  : "-"}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

type InviteRow = { id: string; email: string; order_id: string | null; created_at: string; claimed_at: string | null };
type OrderOption = { id: string; business_name: string };

/**
 * Staff invite a customer to an order. The customer claims it by signing in with that email, so staff
 * never see anyone's account. Invites can only be created for this agency's own orders.
 */
function InvitesPanel({ client, tenantId }: { client: SupabaseClient; tenantId: string }) {
  const [invites, setInvites] = useState<InviteRow[] | null>(null);
  const [orders, setOrders] = useState<OrderOption[]>([]);
  const [email, setEmail] = useState("");
  const [orderId, setOrderId] = useState("");
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const fetchAll = () =>
    Promise.all([
      client.from("client_invites").select("id, email, order_id, created_at, claimed_at").order("created_at", { ascending: false }).limit(50),
      client.from("orders").select("id, business_name").order("created_at", { ascending: false }).limit(100),
    ]).then(([inv, ord]) => {
      setInvites(inv.error ? null : ((inv.data as InviteRow[]) ?? []));
      setOrders(ord.error ? [] : ((ord.data as OrderOption[]) ?? []));
    });

  useEffect(() => {
    fetchAll();
    // Reloads only when the client changes; fetchAll reads the client it was given.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client]);

  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    const { error } = await client.from("client_invites").insert({
      tenant_id: tenantId,
      email: email.trim().toLowerCase(),
      order_id: orderId,
    });
    setBusy(false);
    if (error) {
      setMessage({ kind: "error", text: "The invite couldn't be created. Check the email address and the order." });
      return;
    }
    setMessage({ kind: "ok", text: "Invite created. The customer links the order by signing in with that email." });
    setEmail("");
    setOrderId("");
    fetchAll();
  };

  const orderName = (id: string | null) => orders.find((o) => o.id === id)?.business_name ?? "-";

  return (
    <section className="admin-invites" aria-labelledby="invites-heading">
      <h2 id="invites-heading" className="h3">Invite a customer to an order</h2>
      <form onSubmit={create} className="acct-form">
        <label htmlFor="invite-email" className="acct-label">Customer email</label>
        <input id="invite-email" type="email" required className="acct-input" value={email} onChange={(e) => setEmail(e.target.value)} />
        <label htmlFor="invite-order" className="acct-label">Order</label>
        <select id="invite-order" required className="acct-input" value={orderId} onChange={(e) => setOrderId(e.target.value)}>
          <option value="">Choose an order</option>
          {orders.map((o) => (
            <option key={o.id} value={o.id}>{o.business_name}</option>
          ))}
        </select>
        <button type="submit" className="btn btn--primary" disabled={busy || !orderId}>Create invite</button>
        {message && message.kind === "ok" && <Confirmation title={message.text} />}
        {message && message.kind === "error" && <p role="alert" className="acct-error">{message.text}</p>}
      </form>
      {invites === null && <p className="lede">Invites couldn&apos;t be loaded.</p>}
      {invites && invites.length === 0 && <Empty text="No invites yet." />}
      {invites && invites.length > 0 && (
        <table className="admin-table">
          <thead><tr><th scope="col">Sent</th><th scope="col">Email</th><th scope="col">Order</th><th scope="col">Status</th></tr></thead>
          <tbody>
            {invites.map((r) => (
              <tr key={r.id}>
                <td>{when.format(new Date(r.created_at))}</td>
                <td>{r.email}</td>
                <td>{orderName(r.order_id)}</td>
                <td>{r.claimed_at ? `Linked ${when.format(new Date(r.claimed_at))}` : "Waiting for sign-in"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function OrdersTable({
  client,
  selectedId,
  onSelect,
}: {
  client: SupabaseClient;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const [rows, setRows] = useState<OrderRow[] | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    client
      .from("orders")
      .select("id, business_name, project_type, stage, created_at")
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data, error: err }) => {
        setError(Boolean(err));
        setRows(err ? null : ((data as OrderRow[]) ?? []));
      });
  }, [client]);
  if (error) return <p role="alert">Orders couldn&apos;t be loaded.</p>;
  if (rows === null) return <p className="lede">Loading…</p>;
  if (rows.length === 0) return <Empty text="No orders yet." />;
  return (
    <table className="admin-table admin-table--list">
      <thead><tr><th scope="col">Created</th><th scope="col">Business</th><th scope="col">Project</th><th scope="col">Stage</th><th scope="col" className="admin-table__end"><span className="sr-only">Open</span></th></tr></thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id} aria-selected={selectedId === r.id} className="admin-table__row" onClick={() => onSelect(r.id)}>
            <td>{when.format(new Date(r.created_at))}</td>
            <td>{r.business_name}</td>
            <td>{r.project_type}</td>
            <td>{ORDER_STAGES.find((s) => s.id === r.stage)?.label ?? r.stage}</td>
            <td className="admin-table__end">
              <button
                type="button"
                className="btn btn--secondary"
                aria-pressed={selectedId === r.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(r.id);
                }}
              >
                {selectedId === r.id ? "Open" : "Manage"}
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

type OrderDetail = { id: string; business_name: string; project_type: string; stage: string; stage_updated_at: string };
type UpdateRow = { id: string; message: string; created_at: string };

const ORDER_STAGES = [
  { id: "brief_received", label: "Brief received" },
  { id: "designing", label: "Designing" },
  { id: "building", label: "Building" },
  { id: "reviewing", label: "Reviewing with client" },
  { id: "live", label: "Live" },
] as const;

/**
 * Move one order to its stage and post updates the customer reads on their order. Both are limited by
 * row-level security to this agency's orders, and updates can be posted but never edited or deleted.
 */
function OrderManager({ client, tenantId, orderId }: { client: SupabaseClient; tenantId: string; orderId: string }) {
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [updates, setUpdates] = useState<UpdateRow[] | null>(null);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const loadUpdates = () =>
    client
      .from("order_updates")
      .select("id, message, created_at")
      .eq("order_id", orderId)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data, error }) => setUpdates(error ? null : ((data as UpdateRow[]) ?? [])));

  useEffect(() => {
    client
      .from("orders")
      .select("id, business_name, project_type, stage, stage_updated_at")
      .eq("id", orderId)
      .single()
      .then(({ data, error }) => setOrder(error ? null : (data as OrderDetail)));
    loadUpdates();
    // Reloads when the order changes; the parent gives each order its own instance (keyed by id).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, orderId]);

  const setStage = async (stage: string) => {
    if (!order || order.stage === stage) return;
    setBusy(true);
    setStatus(null);
    const { data, error } = await client
      .from("orders")
      .update({ stage })
      .eq("id", order.id)
      .select("id, stage, stage_updated_at");
    setBusy(false);
    if (error || !data || data.length === 0) {
      setStatus({ kind: "error", text: "The stage couldn't be changed. Please try again." });
      return;
    }
    const row = data[0] as Pick<OrderDetail, "id" | "stage" | "stage_updated_at">;
    setOrder((prev) => (prev ? { ...prev, stage: row.stage, stage_updated_at: row.stage_updated_at } : prev));
    setStatus({ kind: "ok", text: "Stage updated. The customer sees it on their order." });
    void sendQueuedEmails(client);
  };

  const post = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!order) return;
    const text = message.trim();
    if (!text) return;
    setBusy(true);
    setStatus(null);
    const { error } = await client.from("order_updates").insert({ tenant_id: tenantId, order_id: order.id, message: text });
    setBusy(false);
    if (error) {
      setStatus({ kind: "error", text: "The update couldn't be posted. Check it is under 1,000 characters." });
      return;
    }
    setMessage("");
    setStatus({ kind: "ok", text: "Update posted. The customer can read it on their order." });
    void sendQueuedEmails(client);
    loadUpdates();
  };

  if (!order) return <p className="lede">Loading order…</p>;

  return (
    <section className="admin-order" aria-labelledby="order-manage-heading">
      <div>
        <p className="admin-label">Order</p>
        <h2 id="order-manage-heading" className="h3">{order.business_name}</h2>
        <p className="acct-meta">{order.project_type} · stage set {when.format(new Date(order.stage_updated_at))}</p>
      </div>

      <div>
        <p className="admin-label">Stage</p>
        <ol className="track__rail admin-rail" aria-label="Order stage">
          <li className="track__line" aria-hidden="true">
            <span className="track__fill" style={{ "--fill": `${(Math.max(0, ORDER_STAGES.findIndex((s) => s.id === order.stage)) / (ORDER_STAGES.length - 1)) * 100}%` } as React.CSSProperties} />
          </li>
          {ORDER_STAGES.map((s, i) => {
            const current = ORDER_STAGES.findIndex((x) => x.id === order.stage);
            const state = i < current ? "done" : i === current ? "current" : "todo";
            return (
              <li key={s.id} className={`track__item track__step--${state}`}>
                <button
                  type="button"
                  className="track__step admin-rail__step"
                  aria-pressed={order.stage === s.id}
                  disabled={busy}
                  onClick={() => setStage(s.id)}
                >
                  <span className="track__node" aria-hidden="true">{state === "done" ? "\u2713" : i + 1}</span>
                  <span className="track__label">{s.label}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      <form onSubmit={post} className="acct-form">
        <label htmlFor="order-update-text" className="acct-label">Post an update for the customer</label>
        <textarea
          id="order-update-text"
          className="acct-input admin-textarea"
          rows={3}
          maxLength={1000}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <button type="submit" className="btn btn--primary" disabled={busy || message.trim() === ""}>Post update</button>
      </form>

      {status && status.kind === "ok" && <Confirmation title={status.text} />}
        {status && status.kind === "error" && <p role="alert" className="acct-error">{status.text}</p>}

      <div>
        <p className="admin-label">Updates</p>
        {updates === null && <p role="alert">Updates couldn&apos;t be loaded.</p>}
        {updates && updates.length === 0 && <Empty text="No updates posted yet." />}
        {updates && updates.length > 0 && (
          <ol className="admin-updates">
            {updates.map((u) => (
              <li key={u.id}>
                <span className="acct-meta">{when.format(new Date(u.created_at))}</span>
                <p>{u.message}</p>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
