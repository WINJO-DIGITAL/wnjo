"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { QuotesPanel } from "./QuotesPanel";

export const STAGES = [
  { id: "brief_received", label: "Brief received" },
  { id: "designing", label: "Designing" },
  { id: "building", label: "Building" },
  { id: "reviewing", label: "Reviewing with you" },
  { id: "live", label: "Live" },
] as const;

type Stage = (typeof STAGES)[number]["id"];

type Update = { id: string; message: string; created_at: string };
type Order = {
  id: string;
  business_name: string;
  project_type: string;
  stage: Stage;
  stage_updated_at: string;
  created_at: string;
  order_updates: Update[];
};

const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" });

/** Signs a customer in with an emailed link, then shows their orders and where each one has got to. */
export function AccountView() {
  const client = supabase();
  // undefined = still checking for a session; null = signed out.
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!client) return;
    client.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = client.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, [client]);

  useEffect(() => {
    if (!client || !session) return;
    let cancelled = false;
    client
      .from("orders")
      .select("id, business_name, project_type, stage, stage_updated_at, created_at, order_updates(id, message, created_at)")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return;
        setLoadError(Boolean(error));
        setOrders(error ? null : ((data as unknown as Order[]) ?? []));
      });
    return () => {
      cancelled = true;
    };
  }, [client, session]);

  if (!client) {
    return <p className="lede">Customer accounts aren&apos;t switched on yet. Please check back soon.</p>;
  }

  if (session === undefined) {
    return <p className="lede">Checking your sign-in…</p>;
  }

  if (!session) {
    const send = async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setStatus("sending");
      const { error } = await client.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: `${window.location.origin}/account` },
      });
      setStatus(error ? "error" : "sent");
    };

    return (
      <form onSubmit={send} className="acct-form" noValidate={false}>
        <label htmlFor="acct-email" className="acct-label">
          Email address
        </label>
        <input
          id="acct-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="acct-input"
        />
        <button type="submit" className="btn btn--primary" disabled={status === "sending"}>
          {status === "sending" ? "Sending…" : "Email me a sign-in link"}
        </button>
        {status === "sent" && (
          <p role="status">Check your inbox. We&apos;ve sent a sign-in link to {email.trim()}.</p>
        )}
        {status === "error" && (
          <p role="alert">We couldn&apos;t send the link. Please check the address and try again.</p>
        )}
      </form>
    );
  }

  return (
    <div className="acct">
      <div className="acct-bar">
        <p className="acct-meta">Signed in as {session.user.email}</p>
        <button type="button" className="btn btn--secondary" onClick={() => client.auth.signOut()}>
          Sign out
        </button>
      </div>

      {loadError && <p role="alert">We couldn&apos;t load your orders. Please refresh the page.</p>}

      {orders && orders.length === 0 && (
        <p className="lede">
          No orders are linked to this email yet. If you&apos;ve just ordered, we&apos;ll link it shortly.
        </p>
      )}

      {client && <QuotesPanel client={client} />}

      {orders?.map((order) => (
        <article key={order.id} className="acct-order" aria-labelledby={`order-${order.id}`}>
          <p className="eyebrow">{order.project_type}</p>
          <h2 id={`order-${order.id}`} className="h2">
            {order.business_name}
          </h2>
          <ol className="acct-steps" aria-label="Progress">
            {STAGES.map((stage, i) => {
              const current = STAGES.findIndex((s) => s.id === order.stage);
              const state = i < current ? "done" : i === current ? "current" : "todo";
              return (
                <li key={stage.id} className={`acct-step acct-step--${state}`} aria-current={state === "current" ? "step" : undefined}>
                  <span className="acct-step__num" aria-hidden="true">
                    {i + 1}
                  </span>
                  <span>{stage.label}</span>
                </li>
              );
            })}
          </ol>
          <p className="acct-meta">Updated {dateFormat.format(new Date(order.stage_updated_at))}</p>
          {order.order_updates.length > 0 && (
            <ul className="acct-updates">
              {[...order.order_updates]
                .sort((a, b) => b.created_at.localeCompare(a.created_at))
                .map((u) => (
                  <li key={u.id}>
                    <span className="acct-meta">{dateFormat.format(new Date(u.created_at))}</span>
                    <p>{u.message}</p>
                  </li>
                ))}
            </ul>
          )}
        </article>
      ))}
    </div>
  );
}
