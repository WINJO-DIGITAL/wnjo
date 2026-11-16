"use client";

import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { staffStageLabel } from "@/lib/build-journey";
import { KIND_LABEL } from "@/lib/subscription-cancellation";
import { monthlyRecurringPence } from "@/lib/website-subscription-figures";

const money = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });
const day = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });
const DAY_MS = 24 * 3600 * 1000;

type Sub = { id: string; reference: string; kind: string; status: string; name: string; business_name: string | null; email: string; package_name: string; monthly_pence: number; cancel_at_period_end: boolean; livemode: boolean | null; current_period_end: string | null; first_payment_at: string | null; created_at: string };
type Need = { label: string; count: number; href: string };
type Activity = { at: string; title: string; detail: string; href: string };
type View = {
  mrr: number;
  active: number;
  started30: number;
  enquiries7: number;
  needs: Need[];
  renewals: { reference: string; who: string; email: string; at: string; pence: number }[];
  activity: Activity[];
};

/**
 * The staff home. Four figures that describe the business, what is waiting on a person, the payments due in the next
 * week, and what has just happened. Every figure is counted from real records; test-mode plans are never counted.
 */
export function OverviewAdmin({ client }: { client: SupabaseClient }) {
  const [view, setView] = useState<View | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const head = { count: "exact" as const, head: true };
    const now = Date.now();
    const weekAgo = new Date(now - 7 * DAY_MS).toISOString();
    Promise.all([
      client
        .from("website_subscriptions")
        .select("id, reference, kind, status, name, business_name, email, package_name, monthly_pence, cancel_at_period_end, livemode, current_period_end, first_payment_at, created_at")
        .order("created_at", { ascending: false })
        .limit(1000),
      client.from("enquiries").select("id, reference, kind, name, email, topic, created_at").order("created_at", { ascending: false }).limit(200),
      client.from("website_cancellation_requests").select("id", head).eq("status", "open"),
      client.from("website_previews").select("id", head).eq("status", "draft"),
      client.from("build_revisions").select("id", head).in("status", ["open", "in_progress"]),
      client.from("website_proposals").select("id", head).eq("status", "pending_approval"),
      client.from("website_proposals").select("id", head).eq("status", "approved"),
      client.from("website_briefs").select("id", head).in("stage", ["brief_received", "reviewing"]),
      client.from("quotes").select("id", head).eq("status", "sent"),
      client.from("website_briefs").select("id, brief").eq("stage", "specification"),
      client.from("website_subscription_payments").select("subscription_id, amount_pence, paid_at").order("paid_at", { ascending: false }).limit(12),
      client.from("website_subscription_events").select("subscription_id, kind, reason, created_at").order("created_at", { ascending: false }).limit(12),
      client.from("website_brief_events").select("brief_id, kind, detail, created_at, website_briefs(business_name, reference)").eq("kind", "stage").order("created_at", { ascending: false }).limit(12),
    ]).then(([subsR, enqR, cancels, previews, changes, toApprove, toSend, briefs, quotes, specs, payR, evR, stageR]) => {
      if (cancelled) return;
      if (subsR.error || enqR.error) return setError(true);
      const subs = ((subsR.data as Sub[]) ?? []).filter((s) => s.livemode !== false);
      const enquiries = (enqR.data as { id: string; reference: string; kind: string; name: string; email: string; topic: string | null; created_at: string }[]) ?? [];
      const running = subs.filter((s) => s.kind === "subscription" && (s.status === "active" || s.status === "past_due"));
      const overdue = subs.filter((s) => s.status === "past_due").length;
      const withGoals = ((specs.data as { id: string; brief: { goals?: unknown[] } | null }[]) ?? []).filter((r) => (r.brief?.goals?.length ?? 0) > 0).length;
      const who = (s: Sub) => s.business_name || s.name || s.email;
      const byId = new Map(subs.map((s) => [s.id, s]));
      const custHref = (email: string) => `#customers/${encodeURIComponent(email.trim().toLowerCase())}`;

      const needs: Need[] = [
        { label: "Payments overdue", count: overdue, href: "#subscriptions" },
        { label: "Cancellation requests to confirm", count: cancels.count ?? 0, href: "#subscriptions" },
        { label: "Previews to release", count: previews.count ?? 0, href: "#builds" },
        { label: "Customer changes to make", count: changes.count ?? 0, href: "#builds" },
        { label: "Proposals to approve", count: toApprove.count ?? 0, href: "#builds" },
        { label: "Proposals to send", count: toSend.count ?? 0, href: "#builds" },
        { label: "Briefs to review", count: briefs.count ?? 0, href: "#builds" },
        { label: "Goals received, ready for the team", count: withGoals, href: "#builds" },
        { label: "Quotes waiting for an answer", count: quotes.count ?? 0, href: "#quotes" },
      ].filter((n) => n.count > 0);

      const soon = now + 7 * DAY_MS;
      const renewals = running
        .filter((s) => s.status === "active" && !s.cancel_at_period_end && s.current_period_end && new Date(s.current_period_end).getTime() >= now && new Date(s.current_period_end).getTime() <= soon)
        .map((s) => ({ reference: s.reference, who: who(s), email: s.email, at: s.current_period_end as string, pence: s.monthly_pence }))
        .sort((a, b) => a.at.localeCompare(b.at));

      const activity: Activity[] = [
        ...enquiries.slice(0, 12).map((e) => ({ at: e.created_at, title: e.kind === "contact" ? "New message" : "New website enquiry", detail: `${e.name} · ${e.reference}`, href: custHref(e.email) })),
        ...((payR.data as { subscription_id: string; amount_pence: number; paid_at: string }[]) ?? [])
          .filter((p) => byId.has(p.subscription_id))
          .map((p) => ({ at: p.paid_at, title: `Payment received, ${money.format(p.amount_pence / 100)}`, detail: who(byId.get(p.subscription_id)!), href: custHref(byId.get(p.subscription_id)!.email) })),
        ...((evR.data as { subscription_id: string; kind: string; reason: string; created_at: string }[]) ?? [])
          .filter((e) => byId.has(e.subscription_id))
          .map((e) => ({ at: e.created_at, title: KIND_LABEL[e.kind as keyof typeof KIND_LABEL] ?? e.kind, detail: who(byId.get(e.subscription_id)!), href: custHref(byId.get(e.subscription_id)!.email) })),
        ...((stageR.data as unknown as { detail: { to?: string } | null; created_at: string; website_briefs: { business_name: string | null; reference: string } | null }[]) ?? []).map((e) => ({
          at: e.created_at,
          title: e.detail?.to ? `Website moved to ${staffStageLabel(e.detail.to as Parameters<typeof staffStageLabel>[0])}` : "Website stage changed",
          detail: [e.website_briefs?.business_name, e.website_briefs?.reference].filter(Boolean).join(" · "),
          href: "#builds",
        })),
      ]
        .sort((a, b) => b.at.localeCompare(a.at))
        .slice(0, 10);

      setView({
        mrr: monthlyRecurringPence(subs),
        active: running.length,
        started30: subs.filter((s) => s.first_payment_at && now - new Date(s.first_payment_at).getTime() <= 30 * DAY_MS).length,
        enquiries7: enquiries.filter((e) => e.created_at >= weekAgo).length,
        needs,
        renewals,
        activity,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [client]);

  if (error) return <p role="alert">The overview couldn&apos;t be loaded. Please refresh the page.</p>;
  if (!view) return <p className="lede">Loading…</p>;

  return (
    <div className="today">
      <dl className="figures figures--lead">
        <div><dt>Monthly recurring revenue</dt><dd>{money.format(view.mrr / 100)}</dd></div>
        <div><dt><a href="#subscriptions">Active plans</a></dt><dd>{view.active}</dd></div>
        <div><dt>Started in the last 30 days</dt><dd>{view.started30}</dd></div>
        <div><dt><a href="#enquiries">Enquiries this week</a></dt><dd>{view.enquiries7}</dd></div>
      </dl>

      <div className="today__cols">
        <section className="panel" aria-labelledby="needs-title">
          <h2 id="needs-title" className="panel__title">Needs you now</h2>
          {view.needs.length === 0 ? (
            <p className="panel__empty">Nothing is waiting on you.</p>
          ) : (
            <ul className="rows">
              {view.needs.map((n) => (
                <li key={n.label}>
                  <a href={n.href} className="rows__link">
                    <span>{n.label}</span>
                    <span className="rows__count">{n.count}</span>
                  </a>
                </li>
              ))}
            </ul>
          )}

          <h2 className="panel__title panel__title--next">Payments due this week</h2>
          {view.renewals.length === 0 ? (
            <p className="panel__empty">None in the next seven days.</p>
          ) : (
            <ul className="rows">
              {view.renewals.map((r) => (
                <li key={r.reference}>
                  <a href={`#customers/${encodeURIComponent(r.email.trim().toLowerCase())}`} className="rows__link">
                    <span>{r.who}<span className="rows__sub">{day.format(new Date(r.at))}</span></span>
                    <span className="rows__count">{money.format(r.pence / 100)}</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel" aria-labelledby="recent-title">
          <h2 id="recent-title" className="panel__title">Latest</h2>
          {view.activity.length === 0 ? (
            <p className="panel__empty">Nothing has happened yet.</p>
          ) : (
            <ol className="timeline">
              {view.activity.map((a, i) => (
                <li key={i}>
                  <span className="timeline__when">{day.format(new Date(a.at))}</span>
                  <a className="timeline__what" href={a.href}>{a.title}</a>
                  {a.detail && <span className="timeline__detail">{a.detail}</span>}
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}
