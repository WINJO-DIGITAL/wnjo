"use client";

import { useEffect, useState, type CSSProperties, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { QuotesPanel } from "./QuotesPanel";
import { BuildsPanel } from "./BuildsPanel";
import { ProjectsPanel } from "./ProjectsPanel";
import { Confirmation } from "./Confirmation";

export const STAGES = [
  { id: "brief_received", label: "Brief received", short: "Brief" },
  { id: "designing", label: "Designing", short: "Design" },
  { id: "building", label: "Building", short: "Build" },
  { id: "reviewing", label: "Reviewing with you", short: "Review" },
  { id: "live", label: "Live", short: "Live" },
] as const;

type Stage = (typeof STAGES)[number]["id"];

/** One plain sentence on what happens at each stage. Kept short: the rail does the explaining. */
const STAGE_NOTES: Record<Stage, string> = {
  brief_received: "We have your brief and are reading it through.",
  designing: "Layouts are being drawn. You'll see them here before anything is built.",
  building: "Your site is being built, page by page.",
  reviewing: "Ready for you to look at. Tell us what you think, or approve it.",
  live: "It's live. Thanks for choosing WINJO DIGITAL.",
};

/** What the customer does next, shown under the current stage. Kept to one sentence. */
const STAGE_NEXT: Record<Stage, string> = {
  brief_received: "Design starts once you approve the plan.",
  designing: "We'll share the layouts here for you to review.",
  building: "Nothing needed from you. We'll tell you when it's ready to review.",
  reviewing: "Approve when you're happy, and we'll launch.",
  live: "Your first care report arrives next month.",
};

/**
 * The order's progress. Done stages tick, the current one pulses, and the line fills to it.
 * Tap any step to read what happens there; the current step also says what comes next.
 */
function OrderTracker({ stage }: { stage: Stage }) {
  const current = Math.max(0, STAGES.findIndex((s) => s.id === stage));
  const [picked, setPicked] = useState<number | null>(null);
  const shown = picked ?? current;
  const fill = `${(current / (STAGES.length - 1)) * 100}%`;
  const shownStage = STAGES[shown];
  const when = shown === current ? "Now" : shown < current ? "Done" : "Coming up";
  return (
    <div className="track">
      <div className="track__now">
        <span className="track__count">{String(current + 1).padStart(2, "0")} / {String(STAGES.length).padStart(2, "0")}</span>
        <p className="track__title">{STAGES[current].label}</p>
      </div>
      <ol
        className="track__rail"
        aria-label={`Progress: step ${current + 1} of ${STAGES.length}, ${STAGES[current].label}`}
        style={{ "--fill": fill } as CSSProperties}
      >
        <li className="track__line" aria-hidden="true"><span className="track__fill" /></li>
        {STAGES.map((s, i) => {
          const state = i < current ? "done" : i === current ? "current" : "todo";
          const isShown = i === shown;
          return (
            <li key={s.id} className={`track__item track__step--${state}`}>
              <button
                type="button"
                className="track__step"
                aria-pressed={isShown}
                aria-current={state === "current" ? "step" : undefined}
                onClick={() => setPicked(i)}
              >
                <span className={`track__node${isShown ? " track__node--shown" : ""}`} aria-hidden="true">
                  {state === "done" ? (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M2.5 7.5 5.5 10.5 11.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </span>
                <span className="track__label">{s.short}</span>
              </button>
            </li>
          );
        })}
      </ol>
      <div className="track__detail" aria-live="polite">
        <p className="track__detail-when">{when}</p>
        <p className="track__detail-title">{shownStage.label}</p>
        <p className="track__note">{STAGE_NOTES[shownStage.id]}</p>
        {shown === current && <p className="track__next"><span>Next</span> {STAGE_NEXT[stage]}</p>}
      </div>
    </div>
  );
}

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
  const [hasBuilds, setHasBuilds] = useState(false);
  // Set once from the Stripe return address (?deposit= or ?balance= with paid or cancelled); read before first paint.
  const [depositNotice] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    const outcome = params.get("deposit");
    if (outcome === "paid") return "Thank you. We're confirming your deposit now. It will show on your quote within a minute.";
    if (outcome === "cancelled") return "Your deposit wasn't taken. You can try again from your quote.";
    if (params.get("balance") === "paid") return "Thank you. We're confirming your final payment now. It will show on your quote within a minute.";
    if (params.get("balance") === "cancelled") return "Your final payment wasn't taken. You can try again from your quote.";
    return null;
  });

  useEffect(() => {
    if (!client) return;
    client.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = client.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, [client]);

  useEffect(() => {
    if (!client || !session) return;
    let cancelled = false;
    // Attach any orders staff have invited this email to. A failure here must not block the page.
    client
      .rpc("claim_client_invites")
      .then(() => client.rpc("claim_org_invites"))
      .then(() => client
        .from("orders")
        .select("id, business_name, project_type, stage, stage_updated_at, created_at, order_updates(id, message, created_at)")
        .order("created_at", { ascending: false }))
      .then(({ data, error }) => {
        if (cancelled) return;
        setLoadError(Boolean(error));
        setOrders(error ? null : ((data as unknown as Order[]) ?? []));
      });
    return () => {
      cancelled = true;
    };
  }, [client, session]);

  // Staff accounts use the staff admin, not the customer pages. Checked once per session.
  const [isStaff, setIsStaff] = useState<boolean | null>(null);
  useEffect(() => {
    if (!client || !session) return;
    let cancelled = false;
    client
      .from("tenant_members")
      .select("role")
      .eq("user_id", session.user.id)
      .then(({ data }) => {
        if (!cancelled) setIsStaff(Boolean(data && data.length > 0));
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
      <div className="dash-signin">
        <div className="dash-page__head">
          <h1 className="dash-title">Follow your website.</h1>
          <p className="dash-lede">Sign in with the email you ordered with. We&apos;ll email you a link.</p>
        </div>
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
      </div>
    );
  }

  if (isStaff) {
    return (
      <div className="acct">
        <div className="acct-bar">
          <p className="acct-meta">Signed in as {session.user.email}</p>
          <button type="button" className="btn btn--secondary" onClick={() => client.auth.signOut()}>
            Sign out
          </button>
        </div>
        <p className="lede">
          This is a staff account. Staff sign in to the staff admin, not the customer pages. Please{" "}
          <a href="/admin">go to the staff admin</a> to continue.
        </p>
      </div>
    );
  }

  return (
    <div className="acct">
      <div className="dash-page__head">
        <h1 className="dash-title">Your websites</h1>
      </div>

      {loadError && <p role="alert">We couldn&apos;t load your orders. Please refresh the page.</p>}
      {depositNotice && <Confirmation title={depositNotice} />}

      {orders && orders.length === 0 && !hasBuilds && (
        <div className="acct-empty">
          <p className="acct-empty__title">Nothing here yet</p>
          <p className="acct-empty__body">Orders appear here as soon as they&apos;re linked to {session.user.email}.</p>
          <a href="/pricing" className="btn btn--primary">Choose a plan</a>
        </div>
      )}

      {client && <BuildsPanel client={client} onFound={setHasBuilds} />}
      {client && <ProjectsPanel client={client} userId={session.user.id} />}
      {client && <QuotesPanel client={client} />}

      <div id="progress" className="dash-anchor" />
      {orders?.map((order) => (
        <article key={order.id} className="acct-order" aria-labelledby={`order-${order.id}`}>
          <p className="build-card__sub">{order.project_type}</p>
          <h2 id={`order-${order.id}`} className="h2">
            {order.business_name}
          </h2>
          <OrderTracker stage={order.stage} />
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
