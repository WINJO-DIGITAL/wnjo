"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { ProjectsAdmin } from "./ProjectsAdmin";
import { AiStatus } from "./AiStatus";

type Membership = { tenant_id: string; role: "owner" | "admin" | "staff" };
type Enquiry = { id: string; reference: string; kind: string; name: string; email: string; topic: string | null; created_at: string };
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

type Tab = "enquiries" | "quotes" | "orders" | "approvals" | "projects" | "ai";

/**
 * The agency's read-only control area for this step. Every query is limited by row-level security, so
 * a signed-in person sees only what their agency role allows. Anyone else sees a refusal.
 */
export function AdminView() {
  const client = supabase();
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [membership, setMembership] = useState<Membership | null | "loading">("loading");
  const [tab, setTab] = useState<Tab>("enquiries");

  useEffect(() => {
    if (!client) return;
    client.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = client.auth.onAuthStateChange((_e, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, [client]);

  useEffect(() => {
    if (!client || !session) return;
    let cancelled = false;
    client
      .from("tenant_members")
      .select("tenant_id, role")
      .eq("user_id", session.user.id)
      .then(({ data }) => {
        if (cancelled) return;
        const first = (data as Membership[] | null)?.[0];
        setMembership(first ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [client, session]);

  if (!client) return <p className="lede">The admin area isn&apos;t switched on yet.</p>;
  if (session === undefined) return <p className="lede">Checking your access…</p>;
  if (!session) return <SignIn client={client} />;
  if (membership === "loading") return <p className="lede">Checking your access…</p>;
  if (!membership) {
    return (
      <div>
        <p className="lede">You don&apos;t have access to the agency admin.</p>
        <button type="button" className="btn btn--secondary" onClick={() => client.auth.signOut()}>
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="admin">
      <div className="acct-bar">
        <p className="acct-meta">Signed in as {session.user.email} · {membership.role}</p>
        <button type="button" className="btn btn--secondary" onClick={() => client.auth.signOut()}>
          Sign out
        </button>
      </div>
      <nav className="admin-tabs" aria-label="Admin sections">
        {(["enquiries", "quotes", "orders", "approvals", "projects", "ai"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            className="admin-tab"
            aria-current={tab === t ? "page" : undefined}
            onClick={() => setTab(t)}
          >
            {t === "ai" ? "AI" : t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </nav>
      {tab === "enquiries" && <EnquiriesTable client={client} />}
      {tab === "quotes" && <QuotesTable client={client} />}
      {tab === "orders" && (
        <>
          <OrdersTable client={client} />
          <InvitesPanel client={client} tenantId={membership.tenant_id} />
        </>
      )}
      {tab === "approvals" && <ApprovalsTable client={client} />}
      {tab === "ai" && <AiStatus client={client} />}
      {tab === "projects" && <ProjectsAdmin client={client} tenantId={membership.tenant_id} userId={session.user.id} />}
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
      .select("id, reference, kind, name, email, topic, created_at")
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
      <thead><tr><th scope="col">Received</th><th scope="col">Reference</th><th scope="col">Name</th><th scope="col">Type</th><th scope="col">Email</th></tr></thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id}>
            <td>{when.format(new Date(r.created_at))}</td>
            <td>{r.reference}</td>
            <td>{r.name}</td>
            <td>{r.kind === "brief" ? "Brief" : "Contact"}</td>
            <td><a href={`mailto:${r.email}`}>{r.email}</a></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function QuotesTable({ client }: { client: SupabaseClient }) {
  const [rows, setRows] = useState<QuoteRow[] | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    client
      .from("quotes")
      .select("id, reference, status, created_at, expires_at, quote_versions(version, range_low_pence, range_high_pence)")
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data, error: err }) => {
        setError(Boolean(err));
        setRows(err ? null : ((data as unknown as QuoteRow[]) ?? []));
      });
  }, [client]);
  if (error) return <p role="alert">Quotes couldn&apos;t be loaded.</p>;
  if (rows === null) return <p className="lede">Loading…</p>;
  if (rows.length === 0) return <Empty text="No quotes yet." />;
  return (
    <table className="admin-table">
      <thead><tr><th scope="col">Issued</th><th scope="col">Reference</th><th scope="col">Status</th><th scope="col">Range</th><th scope="col">Expires</th></tr></thead>
      <tbody>
        {rows.map((r) => {
          const latest = r.quote_versions[r.quote_versions.length - 1];
          return (
            <tr key={r.id}>
              <td>{when.format(new Date(r.created_at))}</td>
              <td>{r.reference}</td>
              <td>{r.status}</td>
              <td>{latest ? `${money.format(latest.range_low_pence / 100)} to ${money.format(latest.range_high_pence / 100)}` : "-"}</td>
              <td>{r.expires_at ? when.format(new Date(r.expires_at)) : "-"}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
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
        {message && <p role={message.kind === "error" ? "alert" : "status"}>{message.text}</p>}
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

function OrdersTable({ client }: { client: SupabaseClient }) {
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
    <table className="admin-table">
      <thead><tr><th scope="col">Created</th><th scope="col">Business</th><th scope="col">Project</th><th scope="col">Stage</th></tr></thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id}>
            <td>{when.format(new Date(r.created_at))}</td>
            <td>{r.business_name}</td>
            <td>{r.project_type}</td>
            <td>{r.stage}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
