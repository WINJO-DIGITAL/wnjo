"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { ProjectsAdmin } from "./ProjectsAdmin";

type Membership = { tenant_id: string; role: "owner" | "admin" | "staff" };
type Enquiry = { id: string; reference: string; kind: string; name: string; email: string; topic: string | null; created_at: string };
type QuoteRow = { id: string; reference: string; status: string; created_at: string; expires_at: string | null; quote_versions: { version: number; range_high_pence: number; range_low_pence: number }[] };
type OrderRow = { id: string; business_name: string; project_type: string; stage: string; created_at: string };

const money = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });
const when = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });

type Tab = "enquiries" | "quotes" | "orders" | "projects";

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
        {(["enquiries", "quotes", "orders", "projects"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            className="admin-tab"
            aria-current={tab === t ? "page" : undefined}
            onClick={() => setTab(t)}
          >
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </nav>
      {tab === "enquiries" && <EnquiriesTable client={client} />}
      {tab === "quotes" && <QuotesTable client={client} />}
      {tab === "orders" && <OrdersTable client={client} />}
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
