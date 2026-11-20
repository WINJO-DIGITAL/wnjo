"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { openFileTab } from "@/lib/open-tab";
import { PORTAL_STEPS, nextStepFor, portalStepIndex } from "@/lib/portal-steps";
import type { SupabaseClient } from "@supabase/supabase-js";
import { STAGES, progressIndex, stagePath, type ProposalLine, type ProposalStatus, type Route, type Stage } from "@/lib/build-journey";
import type { RevisionRow } from "@/lib/build-revisions";
import { balancePenceFor, proposalPayNowFor } from "@/lib/pay-now";
import { GOALS, STYLES, cleanBrief, type WebsiteBrief } from "@/lib/website-brief";
import type { Progress } from "@/lib/brief-progress";
import { UNNAMED } from "@/lib/website-enquiry";
import { BriefWizard, type WizardApi } from "./BriefWizard";
import { Confirmation } from "./Confirmation";
import { FeedbackCard } from "./FeedbackCard";
import { PayBalanceCard } from "./PayBalanceCard";
import { DOMAIN_COPY, askDomain } from "@/lib/domain-choice";
import { PayCard } from "./PayCard";

type Brief = {
  id: string;
  reference: string;
  name: string;
  business_name: string;
  route: Route;
  stage: Stage;
  brief: WebsiteBrief;
  figures: { package?: string; mode?: string };
  expected_by: string | null;
  balance_paid_at: string | null;
  domain_choice: "have" | "help" | null;
  domain_name: string | null;
  handed_over_at: string | null;
  created_at: string;
  updated_at: string;
};
type StageEvent = { brief_id: string; kind: string; detail: { to?: Stage }; created_at: string };
type Proposal = {
  id: string;
  brief_id: string;
  reference: string;
  status: ProposalStatus;
  summary: string;
  lines: ProposalLine[];
  setup_pence: number;
  monthly_pence: number;
  one_off_pence: number;
};

const day = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });
const expectedFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long" });
const money = (pence: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(pence / 100);

/**
 * The customer's websites in progress: where each one is on its path, when each step happened, and any proposal
 * waiting for their answer. Row-level security limits every read to briefs sent from this person's email.
 */
export function BuildsPanel({ client, onFound }: { client: SupabaseClient; onFound?: (found: boolean) => void }) {
  const [briefs, setBriefs] = useState<Brief[] | null>(null);
  const [events, setEvents] = useState<StageEvent[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [revisions, setRevisions] = useState<RevisionRow[]>([]);
  const [refresh, setRefresh] = useState(0);
  // The website that is open. Null until the customer picks one: the newest is shown first.
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      client.from("website_briefs").select("id, reference, name, business_name, route, stage, brief, figures, expected_by, balance_paid_at, handed_over_at, domain_choice, domain_name, created_at, updated_at").order("created_at", { ascending: false }),
      client.from("website_brief_events").select("brief_id, kind, detail, created_at").order("created_at"),
      client.from("website_proposals").select("id, brief_id, reference, status, summary, lines, setup_pence, monthly_pence, one_off_pence").order("created_at", { ascending: false }),
      client.from("build_revisions").select("id, brief_id, number, status, request, response, created_at, resolved_at").order("number"),
    ]).then(([b, e, p, r]) => {
      if (cancelled) return;
      const list = (b.data as Brief[]) ?? [];
      setBriefs(list);
      setEvents((e.data as StageEvent[]) ?? []);
      setProposals((p.data as Proposal[]) ?? []);
      setRevisions((r.data as RevisionRow[]) ?? []);
      onFound?.(list.length > 0);
    });
    return () => {
      cancelled = true;
    };
  }, [client, refresh, onFound]);

  if (!briefs || briefs.length === 0) return null;
  return (
    <section id="builds" className="acct-quotes" aria-labelledby="acct-builds-title">
      <h2 id="acct-builds-title" className="visually-hidden">
        Your websites in progress
      </h2>
      {briefs.map((b) =>
        // With more than one website, one is open at a time, so the page is never several forms long.
        b.id === (openId ?? briefs[0].id) ? (
          <BuildCard
            key={b.id}
            client={client}
            brief={b}
            events={events.filter((e) => e.brief_id === b.id)}
            proposal={proposals.find((p) => p.brief_id === b.id && p.status === "sent") ?? null}
            accepted={proposals.find((p) => p.brief_id === b.id && p.status === "accepted") ?? null}
            revisions={revisions.filter((r) => r.brief_id === b.id)}
            onChanged={() => setRefresh((r) => r + 1)}
          />
        ) : (
          <BuildRow key={b.id} brief={b} events={events.filter((e) => e.brief_id === b.id)} onOpen={() => setOpenId(b.id)} />
        ),
      )}
    </section>
  );
}

/** A website that isn't the one open: its name, where it has got to, and a way to open it. */
function BuildRow({ brief, events, onOpen }: { brief: Brief; events: StageEvent[]; onOpen: () => void }) {
  const path = stagePath(brief.route);
  const lastOnPath = [...events].reverse().map((e) => e.detail.to).find((s): s is Stage => Boolean(s && path.includes(s)));
  const step = portalStepIndex(brief.stage, lastOnPath);
  const where = step >= PORTAL_STEPS.length ? "Live" : PORTAL_STEPS[step].label;
  return (
    <article className="build-row-card" aria-labelledby={`buildrow-${brief.id}`}>
      <div>
        <h2 id={`buildrow-${brief.id}`} className="build-row-card__title">{brief.business_name || "Your website"}</h2>
        <p className="build-card__sub">
          {brief.figures.package ?? "Website"} · {brief.reference} · {where}
        </p>
      </div>
      <button type="button" className="btn btn--secondary" onClick={onOpen} aria-label={`Open ${brief.business_name || "this website"}`}>
        Open
      </button>
    </article>
  );
}

function BuildCard({
  client,
  brief,
  events,
  proposal,
  accepted,
  revisions,
  onChanged,
}: {
  client: SupabaseClient;
  brief: Brief;
  events: StageEvent[];
  proposal: Proposal | null;
  accepted: Proposal | null;
  revisions: RevisionRow[];
  onChanged: () => void;
}) {
  const path = stagePath(brief.route);
  const lastOnPath = [...events].reverse().map((e) => e.detail.to).find((s): s is Stage => Boolean(s && path.includes(s)));
  const here = progressIndex(brief.route, brief.stage, lastOnPath);
  const reached = (s: Stage) => {
    if (s === "brief_received") return brief.created_at;
    return [...events].reverse().find((e) => e.detail.to === s)?.created_at ?? null;
  };
  const offPath = !path.includes(brief.stage);
  const style = brief.brief.style ? STYLES[brief.brief.style] : null;
  const [tab, setTab] = useState<"overview" | "progress" | "changes">("overview");
  const [allSteps, setAllSteps] = useState(false);
  // Set once the goals form is saved: the customer sees a confirmation before the page moves on.
  const [detailsSaved, setDetailsSaved] = useState(false);
  const step = portalStepIndex(brief.stage, lastOnPath);
  // A website paid for through the short checkout has no goals yet: ask for them before anything else.
  const needsDetails = brief.brief.goals.length === 0 && ["brief_received", "reviewing", "awaiting_payment", "specification"].includes(brief.stage);
  const next = needsDetails
    ? { title: "Tell us about your website", body: "Your goals, pages and style. We start designing as soon as you send them.", action: true, tab: "overview" as const, cta: null }
    : nextStepFor({ stage: brief.stage, route: brief.route, proposalSent: Boolean(proposal) });
  const showPay = brief.route === "proposal" && brief.stage === "awaiting_payment" && accepted;
  // A website bought outright: after the customer approves it, the rest of the price is due, then we hand it over.
  const outright = brief.route === "proposal" && brief.figures.mode === "oneOff" && Boolean(accepted && accepted.one_off_pence > 0);
  const showBalance = outright && ["approval", "live"].includes(brief.stage) && !brief.balance_paid_at;
  const canChange = ["preview", "changes", "approval", "live"].includes(brief.stage) || revisions.length > 0;
  const showPreview = ["preview", "changes", "approval"].includes(brief.stage);
  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "progress", label: "Progress" },
    ...(canChange ? [{ id: "changes", label: "Changes" }] : []),
  ] as const;

  return (
    <article className="acct-order build-card" aria-labelledby={`build-${brief.id}`}>
      <div className="build-card__head">
        {style && (
          <span className="brief-swatch build-card__swatch" aria-hidden="true">
            {style.swatch.map((c) => (
              <span key={c} style={{ background: c }} />
            ))}
          </span>
        )}
        <div>
          <h2 id={`build-${brief.id}`} className="build-card__title">
            {brief.business_name || "Your website"}
          </h2>
          <p className="build-card__sub">
            {brief.figures.package ?? "Website"} · {brief.reference}
          </p>
        </div>
      </div>

      <div className={`next-step${next.action ? " next-step--action" : ""}`}>
        <div>
          <p className="next-step__label">Next step</p>
          <p className="next-step__title">{next.title}</p>
          <p className="next-step__body">{next.body}</p>
          {brief.expected_by && next.action === false && brief.stage !== "live" && brief.stage !== "closed" && (
            <p className="next-step__when">Expected by {expectedFormat.format(new Date(`${brief.expected_by}T12:00:00`))}</p>
          )}
        </div>
        {next.action && next.tab && next.cta && (
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => {
              setTab(next.tab as "overview" | "changes");
              // Already on this tab, so take the customer to the thing the button is about.
              const target = proposal ? `proposal-${proposal.id}` : `panel-${brief.id}-${next.tab}`;
              requestAnimationFrame(() => document.getElementById(target)?.scrollIntoView({ behavior: "smooth", block: "start" }));
            }}
          >
            {next.cta}
          </button>
        )}
      </div>

      <ol className="steps4" aria-label={`Progress: ${step >= PORTAL_STEPS.length ? "complete" : `step ${step + 1} of ${PORTAL_STEPS.length}`}`}>
        {PORTAL_STEPS.map((s, i) => (
          <li key={s.id} className={i < step ? "is-done" : i === step ? "is-current" : undefined} aria-current={i === step ? "step" : undefined}>
            <span className="steps4__bar" />
            <span className="steps4__label">{s.label}</span>
          </li>
        ))}
      </ol>

      <p className="build-card__ask">
        <a href={`/account/help?about=${encodeURIComponent(brief.reference)}`}>Message us about this website</a>
      </p>

      <div className="tabs" role="tablist" aria-label="Website sections">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`tab-${brief.id}-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`panel-${brief.id}-${t.id}`}
            className="tabs__tab"
            onClick={() => setTab(t.id as "overview" | "progress" | "changes")}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${brief.id}-${tab}`} aria-labelledby={`tab-${brief.id}-${tab}`} className="tabs__panel">
        {showPreview && tab !== "progress" && <PreviewLink client={client} briefId={brief.id} />}
        {tab === "overview" && (
          <>
            {needsDetails && !detailsSaved && (
              <BriefDetailsCard client={client} briefId={brief.id} initial={brief.brief} name={brief.name} businessName={brief.business_name} bespoke={brief.route === "proposal"} onSaved={() => setDetailsSaved(true)} />
            )}
            {needsDetails && detailsSaved && <DetailsThanks name={brief.name} onContinue={onChanged} />}
            {proposal && (
              <div id={`proposal-${proposal.id}`}>
                <ProposalCard client={client} proposal={proposal} mode={brief.figures.mode === "oneOff" ? "oneOff" : "monthly"} onChanged={onChanged} />
              </div>
            )}
            {showPay && <PayCard client={client} briefId={brief.id} payNow={proposalPayNowFor(brief.figures.mode === "oneOff" ? "oneOff" : "monthly", accepted)} />}
            {showBalance && accepted && <PayBalanceCard client={client} briefId={brief.id} pence={balancePenceFor(accepted.one_off_pence)} />}
            {outright && brief.balance_paid_at && !brief.handed_over_at && (
              <p className="build-card__meta">Your final payment is in. We&apos;re getting your website ready to hand over to you.</p>
            )}
            {askDomain(brief.stage) && <DomainCard client={client} briefId={brief.id} answer={brief.domain_choice ? { choice: brief.domain_choice, name: brief.domain_name } : null} onChanged={onChanged} />}
            {outright && brief.handed_over_at && (
              <>
                <p className="build-card__meta">Your website has been handed over to you.</p>
                <PackLink client={client} briefId={brief.id} />
              </>
            )}
            {!proposal && !showPay && brief.brief.goals.length > 0 && (
              <p className="build-card__meta">Built for {brief.brief.goals.map((g) => GOALS[g]?.label).filter(Boolean).join(", ")}</p>
            )}
            {!proposal && !showPay && !needsDetails && brief.brief.goals.length === 0 && <p className="build-card__meta">Nothing to do here right now.</p>}
          </>
        )}
        {tab === "progress" && (
          <>
            <p className="build-card__meta">{offPath ? STAGES[brief.stage].customer : STAGES[path[here]].customer}</p>
            <button type="button" className="linkbtn" aria-expanded={allSteps} onClick={() => setAllSteps((v) => !v)}>
              {allSteps ? "Hide all steps" : "See all steps"}
            </button>
            {allSteps && (
              <ol className="build-timeline" role="list" aria-label="All steps">
                {/* Website generation is a staff step; the customer sees the rest of the path. */}
                {path.filter((s) => s !== "building").map((s) => {
                  const i = path.indexOf(s);
                  const at = i <= here ? reached(s) : null;
                  return (
                    <li key={s} className={i < here ? "is-done" : i === here ? "is-current" : undefined} aria-current={i === here ? "step" : undefined}>
                      <span className="build-timeline__label">{STAGES[s].label}</span>
                      {at && <span className="build-timeline__date">{day.format(new Date(at))}</span>}
                    </li>
                  );
                })}
              </ol>
            )}
          </>
        )}
        {tab === "changes" && <FeedbackCard client={client} briefId={brief.id} stage={brief.stage} revisions={revisions} onChanged={onChanged} />}
      </div>
    </article>
  );
}

/** What happens after the goals form: a clear confirmation, and a way on to the progress view. */
function DetailsThanks({ name, onContinue }: { name: string; onContinue: () => void }) {
  const first = name === UNNAMED || !name.trim() ? "" : name.trim().split(/\s+/)[0];
  return (
    <div className="details-thanks">
      <Confirmation
        title={first ? `Thanks, ${first}. We've got your details.` : "Thanks. We've got your details."}
        detail="We're starting on your website now. Each step appears in your progress as it happens."
        nextStep="We'll email you when the first draft is ready to look at."
      />
      <button type="button" className="btn btn--secondary" onClick={onContinue}>
        See your progress
      </button>
    </div>
  );
}

/** The template-site questions stay hidden from customers until the owner sets NEXT_PUBLIC_TEMPLATE_SITES to "on". */
const TEMPLATE_SITES_ON = process.env.NEXT_PUBLIC_TEMPLATE_SITES === "on";

/**
 * The details form for a website paid for through the short checkout, one short step at a time. Progress is saved on
 * the server as they go; sending the details to the team happens only on the last step.
 */
function BriefDetailsCard({
  client,
  briefId,
  initial,
  name: savedName,
  businessName: savedBusiness,
  bespoke,
  onSaved,
}: {
  client: SupabaseClient;
  briefId: string;
  initial: WebsiteBrief;
  name: string;
  businessName: string;
  bespoke: boolean;
  onSaved: () => void;
}) {
  // The last sign-in token seen, so a save can be sent at once when the page is being left, without waiting to read the
  // session first. The server still checks it every time.
  const tokenRef = useRef<string | null>(null);
  const api = useMemo<WizardApi>(() => {
    // One place for the signed-in call, so every request is made the same way.
    const post = async (token: string, path: string, body: unknown, keepalive: boolean): Promise<{ ok: boolean; json: Record<string, unknown> | null } | null> => {
      const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(body), keepalive }).catch(() => null);
      if (!res) return null;
      return { ok: res.ok, json: (await res.json().catch(() => null)) as Record<string, unknown> | null };
    };
    const call = async (path: string, body: unknown, keepalive = false): Promise<{ ok: boolean; json: Record<string, unknown> | null } | null> => {
      const { data } = await client.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return null;
      tokenRef.current = token;
      return post(token, path, body, keepalive);
    };
    return {
      loadAllowance: async () => {
        const r = await call("/api/briefs/allowance", { briefId });
        return r?.ok && typeof r.json?.pages === "number" ? r.json.pages : null;
      },
      loadProgress: async () => {
        const r = await call("/api/briefs/progress", { briefId, action: "load" });
        // Not being able to ask (offline, signed out, a server error) is not the same as "nothing saved": the form
        // waits and asks to try again rather than opening blank and saving over what is stored.
        if (!r || !r.ok) throw new Error("progress_unavailable");
        return (r.json?.progress as Progress | null) ?? null;
      },
      loadKnown: async () => {
        const r = await call("/api/briefs/known", { briefId });
        return r?.ok && typeof r.json?.email === "string" ? { email: r.json.email, phone: typeof r.json.phone === "string" ? r.json.phone : "" } : null;
      },
      saveProgress: async (progress) => {
        // keepalive lets the request finish even as the page closes or the app goes to the background.
        const payload = { briefId, action: "save", progress };
        const known = tokenRef.current;
        const r = known ? await post(known, "/api/briefs/progress", payload, true) : await call("/api/briefs/progress", payload, true);
        // A refused token (it expired) is read fresh and sent once more.
        if (r && !r.ok && known) return Boolean((await call("/api/briefs/progress", payload, true))?.ok);
        return Boolean(r?.ok);
      },
      viewFile: async (file) => {
        const r = await call("/api/briefs/file", { briefId, path: file.path });
        return r?.ok && typeof r.json?.url === "string" ? r.json.url : null;
      },
      send: async ({ name, businessName, brief, draftId }) => {
        const r = await call("/api/briefs/details", { briefId, draftId, name, businessName, brief: cleanBrief(brief, draftId ?? undefined) });
        if (r?.ok) return { ok: true };
        return { ok: false, error: typeof r?.json?.error === "string" ? r.json.error : "We couldn't save that just now. Please try again." };
      },
    };
  }, [client, briefId]);

  return <BriefWizard initial={initial} name={savedName === UNNAMED ? "" : savedName} businessName={savedBusiness} typesOn={TEMPLATE_SITES_ON} api={api} onSent={onSaved} bespoke={bespoke} />;
}

/** Opens the customer's private preview in a new tab. The address comes from the server, only for the website's owner. */
function PreviewLink({ client, briefId }: { client: SupabaseClient; briefId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = async () => {
    setBusy(true);
    setError(null);
    const opened = await openFileTab(async () => {
      const { data } = await client.auth.getSession();
      const token = data.session?.access_token;
      const res = token
        ? await fetch("/api/briefs/preview", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ briefId }) }).catch(() => null)
        : null;
      const json = (await res?.json().catch(() => null)) as { url?: string } | null;
      return res?.ok && json?.url ? json.url : null;
    });
    setBusy(false);
    if (opened) return;
    setError("Your preview isn't ready to view yet. We'll let you know.");
  };

  return (
    <div className="btn-row">
      <button type="button" className="btn btn--primary" disabled={busy} onClick={() => void open()}>
        {busy ? "Opening…" : "View your preview"}
      </button>
      {error && <p className="field-error" role="alert">{error}</p>}
    </div>
  );
}

/** "Your website address": a yes or no question, then the address if they have one. Saved on the server. */
function DomainCard({ client, briefId, answer, onChanged }: { client: SupabaseClient; briefId: string; answer: { choice: "have" | "help"; name: string | null } | null; onChanged: () => void }) {
  const [choice, setChoice] = useState<"have" | "help" | null>(answer?.choice ?? null);
  const [name, setName] = useState(answer?.name ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(!!answer);

  const save = async () => {
    setBusy(true);
    setError(null);
    const { data } = await client.auth.getSession();
    const token = data.session?.access_token;
    const res = token
      ? await fetch("/api/briefs/domain", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ briefId, choice, name }) }).catch(() => null)
      : null;
    const json = (await res?.json().catch(() => null)) as { error?: string } | null;
    setBusy(false);
    if (!res?.ok) {
      setError(json?.error ?? "We couldn't save that. Please try again.");
      return;
    }
    setSaved(true);
    onChanged();
  };

  if (saved && answer) {
    return (
      <div className="build-card__meta">
        <p className="admin-label">{DOMAIN_COPY.heading}</p>
        <p>{answer.choice === "have" ? `You're using ${answer.name}.` : "We'll help you get a web address."}</p>
        <button type="button" className="linkbtn" onClick={() => setSaved(false)}>Change</button>
      </div>
    );
  }

  return (
    <fieldset className="build-card__meta">
      <legend className="admin-label">{DOMAIN_COPY.heading}</legend>
      <p>{DOMAIN_COPY.question}</p>
      <label className="acct-check"><input type="radio" name={`domain-${briefId}`} checked={choice === "have"} onChange={() => setChoice("have")} /> {DOMAIN_COPY.yes}</label>
      <label className="acct-check"><input type="radio" name={`domain-${briefId}`} checked={choice === "help"} onChange={() => setChoice("help")} /> {DOMAIN_COPY.help}</label>
      {choice === "have" && (
        <>
          <label className="acct-label" htmlFor={`domain-name-${briefId}`}>Your web address</label>
          <input id={`domain-name-${briefId}`} className="acct-input" value={name} placeholder="hartleyandsons.co.uk" maxLength={253} onChange={(e) => setName(e.target.value)} />
          <p className="acct-meta">{DOMAIN_COPY.ask}</p>
        </>
      )}
      {error && <p className="field-error" role="alert">{error}</p>}
      <button type="button" className="btn btn--primary" disabled={busy || !choice} onClick={() => void save()}>
        {busy ? "Saving…" : "Save"}
      </button>
    </fieldset>
  );
}

/** Downloads the customer's website pack. The link comes from the server, only for the owner of a handed-over website. */
function PackLink({ client, briefId }: { client: SupabaseClient; briefId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = async () => {
    setBusy(true);
    setError(null);
    let reason: string | null = null;
    const opened = await openFileTab(async () => {
      const { data } = await client.auth.getSession();
      const token = data.session?.access_token;
      const res = token
        ? await fetch("/api/briefs/handover-pack", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ briefId }) }).catch(() => null)
        : null;
      const json = (await res?.json().catch(() => null)) as { url?: string; error?: string } | null;
      if (!res?.ok) reason = json?.error ?? null;
      return res?.ok && json?.url ? json.url : null;
    });
    setBusy(false);
    if (!opened) setError(reason && reason !== "not_found" ? reason : "Your website pack isn't ready to download yet. Please message us.");
  };

  return (
    <div className="btn-row">
      <button type="button" className="btn btn--primary" disabled={busy} onClick={() => void open()}>
        {busy ? "Preparing…" : "Download your website pack"}
      </button>
      {error && <p className="field-error" role="alert">{error}</p>}
    </div>
  );
}

function ProposalCard({ client, proposal, mode, onChanged }: { client: SupabaseClient; proposal: Proposal; mode: "monthly" | "oneOff"; onChanged: () => void }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<"accept" | "decline" | null>(null);
  const [confirming, setConfirming] = useState<"accept" | "decline" | null>(null);

  const respond = async (decision: "accept" | "decline") => {
    if (decision === "decline" && !note.trim()) {
      setConfirming(null);
      setError("Tell us what you'd like changed, so we can send you a new proposal.");
      return;
    }
    setBusy(true);
    setError(null);
    const { data } = await client.auth.getSession();
    const token = data.session?.access_token;
    const res = token
      ? await fetch("/api/briefs/respond", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ proposalId: proposal.id, decision, note }),
        }).catch(() => null)
      : null;
    const json = (await res?.json().catch(() => null)) as { error?: string } | null;
    setBusy(false);
    setConfirming(null);
    if (!res?.ok) {
      setError(json?.error ?? "That didn't go through. Please try again.");
      return;
    }
    setDone(decision);
    onChanged();
  };

  if (done) {
    return (
      <Confirmation
        title={done === "accept" ? "Proposal accepted. Your payment is shown below." : "Thanks. We'll update your proposal and send you a new one."}
      />
    );
  }

  const first = proposal.setup_pence + proposal.one_off_pence;
  return (
    <div className="build-offer">
      <p className="build-card__meta">Proposal {proposal.reference}</p>
      {proposal.summary && <p>{proposal.summary}</p>}
      <ul className="build-lines" role="list">
        {proposal.lines.map((l, i) => (
          <li key={i}>
            <span>{l.label}</span>
            <span>
              {money(Math.round(l.amount * 100))}
              {l.kind === "monthly" ? " a month" : l.kind === "setup" ? " setup" : ""}
            </span>
          </li>
        ))}
      </ul>
      <p className="build-offer__total">
        {first > 0 && <strong>{money(first)}</strong>}
        {first > 0 && proposal.monthly_pence > 0 && " + "}
        {proposal.monthly_pence > 0 && (
          <strong>
            {money(proposal.monthly_pence)} <span>a month</span>
          </strong>
        )}
      </p>
      {mode === "oneOff" && proposal.one_off_pence > 0 && (
        <dl className="build-split">
          <div>
            <dt>Deposit to start (50%)</dt>
            <dd>{money(proposalPayNowFor("oneOff", proposal).pence)}</dd>
          </div>
          <div>
            <dt>Balance, when you approve your website</dt>
            <dd>{money(proposal.one_off_pence - proposalPayNowFor("oneOff", proposal).pence)}</dd>
          </div>
        </dl>
      )}
      <label htmlFor={`note-${proposal.id}`} className="acct-label">
        Anything to add, or what to change? <span className="optional">(needed if you ask for changes)</span>
      </label>
      <textarea id={`note-${proposal.id}`} className="acct-input" rows={2} maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)} />
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
      {confirming ? (
        <div className="btn-row">
          <button type="button" className="btn btn--primary" disabled={busy} onClick={() => void respond(confirming)}>
            {busy ? "Sending…" : confirming === "accept" ? "Yes, accept" : "Yes, ask for changes"}
          </button>
          <button type="button" className="btn btn--secondary" disabled={busy} onClick={() => setConfirming(null)}>
            Cancel
          </button>
        </div>
      ) : (
        <div className="btn-row">
          <button type="button" className="btn btn--primary" onClick={() => setConfirming("accept")}>
            Accept proposal
          </button>
          <button type="button" className="btn btn--secondary" onClick={() => setConfirming("decline")}>
            Ask for changes
          </button>
        </div>
      )}
      <p className="fine">Accepting doesn&apos;t charge you. Your payment comes next, with the full terms.</p>
    </div>
  );
}
