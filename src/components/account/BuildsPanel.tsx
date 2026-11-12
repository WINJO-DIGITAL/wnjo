"use client";

import { useEffect, useState } from "react";
import { PORTAL_STEPS, nextStepFor, portalStepIndex } from "@/lib/portal-steps";
import type { SupabaseClient } from "@supabase/supabase-js";
import { STAGES, progressIndex, stagePath, type ProposalLine, type ProposalStatus, type Route, type Stage } from "@/lib/build-journey";
import type { RevisionRow } from "@/lib/build-revisions";
import { proposalPayNowFor } from "@/lib/pay-now";
import { GOALS, STYLES, cleanBrief, validateBrief, type BriefErrors, type WebsiteBrief } from "@/lib/website-brief";
import { DesignFields, FilesField, FunctionalityField, GoalsField, PagesField, type BriefChange } from "@/components/configurator/BriefSteps";
import { SITE_COLOURS, SiteFields } from "@/components/configurator/SiteFields";
import { parseAnswers } from "@/lib/site-template/answers";
import { SECTOR_PRESETS } from "@/lib/site-template/presets";
import { DETAIL_LIMITS, UNNAMED } from "@/lib/website-enquiry";
import { Confirmation } from "./Confirmation";
import { FeedbackCard } from "./FeedbackCard";
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

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      client.from("website_briefs").select("id, reference, name, business_name, route, stage, brief, figures, expected_by, created_at, updated_at").order("created_at", { ascending: false }),
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
      {briefs.map((b) => (
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
      ))}
    </section>
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
          <button type="button" className="btn btn--primary" onClick={() => setTab(next.tab as "overview" | "changes")}>
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
        <a href={`/contact?brief=${encodeURIComponent(`About my website ${brief.reference}: `)}`}>Message us about this website</a>
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
              <BriefDetailsCard client={client} briefId={brief.id} initial={brief.brief} name={brief.name} businessName={brief.business_name} onSaved={() => setDetailsSaved(true)} />
            )}
            {needsDetails && detailsSaved && <DetailsThanks name={brief.name} onContinue={onChanged} />}
            {proposal && <ProposalCard client={client} proposal={proposal} onChanged={onChanged} />}
            {showPay && <PayCard client={client} briefId={brief.id} payNow={proposalPayNowFor(brief.figures.mode === "oneOff" ? "oneOff" : "monthly", accepted)} />}
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
                {path.map((s, i) => {
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

/** Goals, pages and design for a website paid for through the short checkout. Saved on the website, then we start drafting. */
function BriefDetailsCard({
  client,
  briefId,
  initial,
  name: savedName,
  businessName: savedBusiness,
  onSaved,
}: {
  client: SupabaseClient;
  briefId: string;
  initial: WebsiteBrief;
  name: string;
  businessName: string;
  onSaved: () => void;
}) {
  const [brief, setBrief] = useState<WebsiteBrief>(initial);
  // A short checkout stores "New customer" until they say who they are.
  const [name, setName] = useState(savedName === UNNAMED ? "" : savedName);
  const [businessName, setBusinessName] = useState(savedBusiness);
  const [errors, setErrors] = useState<BriefErrors>({});
  const [siteErrors, setSiteErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  // A folder for this form's uploads. The id is never printed, so the server and browser renders still match.
  const [draftId] = useState<string | null>(() => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : null));
  const update: BriefChange = (patch) => {
    setBrief((b) => ({ ...b, ...(typeof patch === "function" ? patch(b) : patch) }));
    setErrors({});
    setSiteErrors({});
  };

  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    // The business name is asked once, above, and goes into the sector answers too.
    const cleaned = cleanBrief({ ...brief, site: brief.site ? { ...brief.site, answers: { ...brief.site.answers, businessName } } : null }, draftId ?? undefined);
    const missing = validateBrief(cleaned);
    if (missing.goals || missing.pages) {
      setErrors(missing);
      return;
    }
    if (cleaned.site) {
      const parsed = parseAnswers(cleaned.site.answers, SECTOR_PRESETS[cleaned.site.sector], { colour: SITE_COLOURS[0].hex });
      if (!parsed.ok) {
        setSiteErrors(parsed.errors);
        setMessage("A few answers need another look. They are marked above.");
        return;
      }
    }
    setBusy(true);
    setMessage(null);
    const { data } = await client.auth.getSession();
    const token = data.session?.access_token;
    const res = token
      ? await fetch("/api/briefs/details", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ briefId, draftId, name, businessName, brief: cleaned }),
        }).catch(() => null)
      : null;
    const json = (await res?.json().catch(() => null)) as { error?: string } | null;
    setBusy(false);
    if (res?.ok) {
      // Stay on the form's own confirmation. The page reloads when the customer chooses to continue.
      onSaved();
      return;
    }
    setMessage(json?.error ?? "We couldn't save that just now. Please try again.");
  };

  return (
    <form onSubmit={send} noValidate className="form stack" style={{ "--stack": "var(--space-5)" } as React.CSSProperties}>
      <div className="field">
        <label htmlFor={`bd-name-${briefId}`}>Your name</label>
        <input id={`bd-name-${briefId}`} className="input" maxLength={DETAIL_LIMITS.name} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor={`bd-biz-${briefId}`}>Business name</label>
        <input id={`bd-biz-${briefId}`} className="input" maxLength={DETAIL_LIMITS.businessName} autoComplete="organization" value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
      </div>
      <GoalsField brief={brief} onChange={update} error={errors.goals} />
      {TEMPLATE_SITES_ON && <SiteFields brief={brief} onChange={update} errors={siteErrors} businessName={businessName} />}
      {!brief.site && <PagesField brief={brief} onChange={update} error={errors.pages} bandMax={null} />}
      {!brief.site && <DesignFields brief={brief} onChange={update} />}
      <FilesField brief={brief} onChange={update} draftId={draftId} />
      <FunctionalityField brief={brief} onChange={update} />
      {message && (
        <p className="field-error" role="alert">
          {message}
        </p>
      )}
      <button type="submit" className="btn btn--primary" disabled={busy}>
        {busy ? "Sending…" : "Send to the team"}
      </button>
    </form>
  );
}

/** Opens the customer's private preview in a new tab. The address comes from the server, only for the website's owner. */
function PreviewLink({ client, briefId }: { client: SupabaseClient; briefId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = async () => {
    setBusy(true);
    setError(null);
    const { data } = await client.auth.getSession();
    const token = data.session?.access_token;
    const res = token
      ? await fetch("/api/briefs/preview", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ briefId }) }).catch(() => null)
      : null;
    const json = (await res?.json().catch(() => null)) as { url?: string } | null;
    setBusy(false);
    if (res?.ok && json?.url) {
      window.open(json.url, "_blank", "noopener,noreferrer");
      return;
    }
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

function ProposalCard({ client, proposal, onChanged }: { client: SupabaseClient; proposal: Proposal; onChanged: () => void }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<"accept" | "decline" | null>(null);
  const [confirming, setConfirming] = useState<"accept" | "decline" | null>(null);

  const respond = async (decision: "accept" | "decline") => {
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
        title={done === "accept" ? "Proposal accepted. We'll send your payment link shortly." : "Proposal declined. We'll be in touch."}
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
      <label htmlFor={`note-${proposal.id}`} className="acct-label">
        Anything to add? <span className="optional">(optional)</span>
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
            {busy ? "Sending…" : confirming === "accept" ? "Yes, accept" : "Yes, decline"}
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
            Decline
          </button>
        </div>
      )}
      <p className="fine">Accepting doesn&apos;t charge you. We send a secure payment link next, with the full terms.</p>
    </div>
  );
}
