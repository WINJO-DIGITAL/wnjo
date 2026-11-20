"use client";

import { HANDOVER_CHECKLIST } from "@/lib/handover-pack";
import { openFileTab } from "@/lib/open-tab";
import { useCallback, useEffect, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  staffStageLabel,
  APPROVALS,
  APPROVAL_ORDER,
  PROPOSAL_STATUSES,
  approvalState,
  stagePath,
  type ApprovalKind,
  type ApprovalRecord,
  type ProposalLine,
  type ProposalStatus,
  type Route,
  type Stage,
} from "@/lib/build-journey";
import { REVISION_STATUSES, isUnfinished, type RevisionRow } from "@/lib/build-revisions";
import { CUSTOMERS, FIRST_ACTIONS, GOALS, STYLES, TONES, type WebsiteBrief } from "@/lib/website-brief";
import { SECTOR_PRESETS } from "@/lib/site-template/presets";
import { STYLES as SITE_STYLES, STYLE_INFO } from "@/lib/site-template/styles";
import { extrasRows } from "@/lib/brief-extras";

type BriefRow = {
  id: string;
  reference: string;
  name: string;
  business_name: string;
  email: string;
  route: Route;
  stage: Stage;
  version: number;
  brief: WebsiteBrief;
  figures: { package?: string; mode?: string; monthly?: number; setup?: number; oneOffTotal?: number; requiresQuote?: boolean; quoteReasons?: string[] };
  expected_by: string | null;
  balance_paid_at: string | null;
  handed_over_at: string | null;
  domain_choice: "have" | "help" | null;
  domain_name: string | null;
  domain_answered_at: string | null;
  manual_preview_url: string | null;
  manual_preview_at: string | null;
  created_at: string;
};
type EventRow = { id: string; kind: string; detail: Record<string, unknown>; actor_type: string; actor_email: string | null; created_at: string };
type Approval = ApprovalRecord & { id: string; note: string; decided_by_email: string; decided_by_role: string; proposal_id: string | null };
type Proposal = {
  id: string;
  reference: string;
  status: ProposalStatus;
  source: string;
  summary: string;
  lines: ProposalLine[];
  setup_pence: number;
  monthly_pence: number;
  one_off_pence: number;
  customer_note: string;
  created_at: string;
};

const money = (pence: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(pence / 100);
const pounds = (n?: number) => (typeof n === "number" ? new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(n) : "–");
const when = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

type Call = (payload: Record<string, unknown>, url?: string) => Promise<{ ok: boolean; json: Record<string, unknown> }>;

/**
 * Website builds for staff: each brief, its stage, the four approvals and (for bespoke briefs) the proposal. Reads
 * through row-level security; every change goes through the server, which records who made it.
 */
/**
 * How new websites are made. Automatic: the AI plans, picks a style and builds a draft as soon as the customer sends
 * their goals. Manual: nothing is built; the owner is emailed the brief and builds it themselves. Owners and admins only.
 */
/** Off while every website is built by hand. The switch is kept here so the AI option can come back later. */
const BUILD_MODE_CHOICE_ON = false;

function BuildModeSwitch({ client }: { client: SupabaseClient }) {
  const [mode, setMode] = useState<"auto" | "manual" | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const token = useCallback(async () => (await client.auth.getSession()).data.session?.access_token ?? null, [client]);
  useEffect(() => {
    void (async () => {
      const t = await token();
      if (!t) return;
      const res = await fetch("/api/admin/build-mode", { headers: { Authorization: `Bearer ${t}` } });
      const json = (await res.json().catch(() => ({}))) as { mode?: "auto" | "manual" };
      if (res.ok && json.mode) setMode(json.mode);
    })();
  }, [token]);
  const choose = async (next: "auto" | "manual") => {
    if (next === mode) return;
    setBusy(true);
    setMessage(null);
    const t = await token();
    const res = t ? await fetch("/api/admin/build-mode", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` }, body: JSON.stringify({ mode: next }) }) : null;
    setBusy(false);
    if (res?.ok) setMode(next);
    else setMessage(res?.status === 403 ? "Only an owner or admin can change this." : "That didn't save. Please try again.");
  };
  if (!BUILD_MODE_CHOICE_ON || mode === null) return null;
  return (
    <fieldset className="admin-mode" disabled={busy}>
      <legend className="admin-label">How new websites are made</legend>
      <div className="admin-actions" role="radiogroup" aria-label="How new websites are made">
        <button type="button" role="radio" aria-checked={mode === "auto"} className={mode === "auto" ? "btn btn--primary" : "btn btn--secondary"} onClick={() => void choose("auto")}>
          The AI builds a draft
        </button>
        <button type="button" role="radio" aria-checked={mode === "manual"} className={mode === "manual" ? "btn btn--primary" : "btn btn--secondary"} onClick={() => void choose("manual")}>
          I build them myself
        </button>
      </div>
      <p className="acct-meta">
        {mode === "auto"
          ? "When a customer pays and sends their goals, the AI plans, picks a style, builds a draft and emails you to review it."
          : "When a customer pays and sends their goals, nothing is built. You are emailed the brief, ready to paste into a CLAUDE.md, and build it yourself."}
      </p>
      {message && <p role="alert" className="acct-meta">{message}</p>}
    </fieldset>
  );
}

/** The website named in the address (#builds/<id>), so Today and other screens can open one directly. */
function briefFromHash(): string | null {
  if (typeof window === "undefined") return null;
  const m = window.location.hash.match(/^#builds\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i);
  return m ? m[1].toLowerCase() : null;
}

export function BuildsAdmin({ client }: { client: SupabaseClient }) {
  const [rows, setRows] = useState<BriefRow[] | null>(null);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState<string | null>(briefFromHash);
  useEffect(() => {
    const onHash = () => {
      const id = briefFromHash();
      if (id) setSelected(id);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  // The detail is shown under the table, so bring it into view when a brief is opened (on a phone it is far below).
  const detailRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (selected) detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [selected]);

  const load = useCallback(() => {
    client
      .from("website_briefs")
      .select("id, reference, name, business_name, email, route, stage, version, brief, figures, expected_by, balance_paid_at, handed_over_at, domain_choice, domain_name, domain_answered_at, manual_preview_url, manual_preview_at, created_at")
      .order("created_at", { ascending: false })
      .limit(200)
      .then(({ data, error: err }) => {
        setError(Boolean(err));
        setRows(err ? null : ((data as BriefRow[]) ?? []));
      });
  }, [client]);
  useEffect(load, [load]);

  const call: Call = async (payload, url = "/api/admin/briefs") => {
    const { data } = await client.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return { ok: false, json: { error: "Please sign in again." } };
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    return { ok: res.ok, json: (await res.json().catch(() => ({}))) as Record<string, unknown> };
  };

  if (error) return <p role="alert">Website builds couldn&apos;t be loaded.</p>;
  if (rows === null) return <p className="lede">Loading…</p>;
  if (rows.length === 0) return (
    <div className="stack" style={{ "--stack": "var(--space-6)" } as React.CSSProperties}>
      <BuildModeSwitch client={client} />
      <p className="lede">No briefs yet. They appear here when someone sends one from Get started.</p>
    </div>
  );

  const current = rows.find((r) => r.id === selected) ?? null;
  return (
    <div className="stack" style={{ "--stack": "var(--space-6)", minWidth: 0 } as React.CSSProperties}>
      <BuildModeSwitch client={client} />
      <div className="table-wrap" role="region" aria-label="Website briefs" tabIndex={0}>
      <table className="admin-table admin-table--list">
        <thead>
          <tr>
            <th scope="col">Website</th>
            <th scope="col">Plan</th>
            <th scope="col">Stage</th>
            <th scope="col" className="admin-table__end">Received</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} aria-selected={r.id === selected} className="admin-table__row" onClick={() => setSelected(r.id === selected ? null : r.id)}>
              <td>
                <button
                  type="button"
                  className="admin-table__open"
                  aria-expanded={r.id === selected}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelected(r.id === selected ? null : r.id);
                  }}
                >
                  {r.business_name || r.name}
                </button>
                <span className="admin-table__sub">{r.reference}</span>
              </td>
              <td>
                {r.route === "proposal" ? "Bespoke" : r.figures.package}
                <span className="admin-table__sub">
                  {r.figures.mode === "monthly" ? `${pounds(r.figures.monthly)} a month` : pounds(r.figures.oneOffTotal)}
                </span>
              </td>
              <td>{staffStageLabel(r.stage)}</td>
              <td className="admin-table__end">{when.format(new Date(r.created_at))}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      {current && (
        <div id="brief-detail" ref={detailRef}>
          <BriefDetail key={current.id} client={client} row={current} call={call} onChanged={load} />
        </div>
      )}
    </div>
  );
}

type DetailTab = "work" | "brief" | "approvals" | "history";
const DETAIL_TABS: { id: DetailTab; label: string }[] = [
  { id: "work", label: "Work" },
  { id: "brief", label: "Brief" },
  { id: "approvals", label: "Approvals" },
  { id: "history", label: "History" },
];

/**
 * The whole brief as Markdown, for building this website by hand: copy it into a CLAUDE.md. It carries the customer's own
 * words, the rules that keep a hand-built site honest, and hour-long download links for their files.
 */
function HandoffBrief({ row, call }: { row: BriefRow; call: Call }) {
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "busy" | "copied" | "failed" | "manual">("idle");
  const boxRef = useRef<HTMLTextAreaElement | null>(null);
  const make = () => {
    setState("busy");
    setMarkdown(null);
    const fetched = call({ action: "handoff", briefId: row.id }).then((r) => {
      const text = typeof r.json.markdown === "string" ? r.json.markdown : null;
      if (!r.ok || !text) throw new Error("no brief");
      setMarkdown(text);
      return text;
    });
    fetched.catch(() => setState("failed"));
    // Safari (iPhone and iPad) only lets the page copy during the tap itself, so the copy starts now, with the brief
    // promised as a blob, and not after the brief has been fetched (which would be too late and fail silently).
    const copied =
      typeof ClipboardItem !== "undefined" && typeof navigator.clipboard?.write === "function"
        ? navigator.clipboard.write([new ClipboardItem({ "text/plain": fetched.then((t) => new Blob([t], { type: "text/plain" })) })])
        : fetched.then((t) => navigator.clipboard.writeText(t));
    copied.then(
      () => setState("copied"),
      () => {
        // Refused by the browser: the brief is shown below, and a button selects it so it can be copied by hand.
        void fetched.then(
          () => setState("manual"),
          () => undefined,
        );
      },
    );
  };
  const selectBrief = () => {
    const box = boxRef.current;
    if (!box) return;
    box.focus();
    box.select();
    box.setSelectionRange(0, box.value.length);
  };
  return (
    <div className="stack" style={{ "--stack": "var(--space-2)", marginBottom: "var(--space-4)" } as React.CSSProperties}>
      <div className="admin-actions">
        <button type="button" className="btn btn--primary" disabled={state === "busy"} onClick={() => void make()}>
          {state === "busy" ? "Making the brief…" : state === "copied" ? "Copied. Paste it into a CLAUDE.md" : "Copy brief for Claude"}
        </button>
      </div>
      <p className="acct-meta">Everything this customer told us, with the rules for a hand-built website, as one block to paste into a CLAUDE.md.</p>
      {state === "failed" && <p role="alert" className="acct-meta">The brief couldn&apos;t be made. Please try again.</p>}
      {state === "manual" && <p className="acct-meta">This browser wouldn&apos;t copy it for you. Tap Select brief below, then copy the highlighted text.</p>}
      {markdown && (
        <>
          <textarea ref={boxRef} className="acct-input" readOnly rows={12} value={markdown} aria-label="The brief, ready to copy" onFocus={(e) => e.currentTarget.select()} />
          <div className="admin-actions">
            <button type="button" className="btn btn--secondary" onClick={selectBrief}>
              Select brief
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * A website the owner builds by hand. Copy the brief, build it, paste its address here, and the customer sees it as their
 * preview in their account: they can look at it, approve it or ask for changes, exactly as with any other preview. The
 * address is only shown to the signed-in owner of the website, and an owner can take it back at any time.
 */
function HandBuilt({ row, call, onChanged }: { row: BriefRow; call: Call; onChanged: () => void }) {
  const [url, setUrl] = useState(row.manual_preview_url ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const paid = ["specification", "building", "preview", "changes", "approval"].includes(row.stage);
  const open = ["specification", "building", "preview", "changes"].includes(row.stage);
  if (!paid) return null;
  const send = async () => {
    setBusy(true);
    setMessage(null);
    const r = await call({ action: "manual_release", briefId: row.id, url });
    setBusy(false);
    setMessage({ ok: r.ok, text: r.ok ? "Sent. The customer can see it in their account, and they have been emailed." : String(r.json.error ?? "That didn't work.") });
    if (r.ok) onChanged();
  };
  const takeBack = async () => {
    setBusy(true);
    setMessage(null);
    const r = await call({ action: "manual_withdraw", briefId: row.id });
    setBusy(false);
    setMessage({ ok: r.ok, text: r.ok ? "Taken back. The customer no longer has the address." : String(r.json.error ?? "That didn't work.") });
    if (r.ok) {
      setUrl("");
      onChanged();
    }
  };
  return (
    <div className="stack" style={{ "--stack": "var(--space-3)" } as React.CSSProperties}>
      <p className="admin-label">Built by hand</p>
      <HandoffBrief row={row} call={call} />
      {open ? (
        <>
          <label className="acct-label">
            Address of the finished website
            <input className="acct-input" type="url" inputMode="url" placeholder="https://" value={url} maxLength={500} onChange={(e) => setUrl(e.target.value)} />
          </label>
          <p className="acct-meta">
            The customer is shown this as their preview, in their account, once you send it. They can approve it or ask for changes. Keep it unlisted and out of search (a Vercel preview address already is), and they will only be given it after signing in.
          </p>
          <div className="admin-actions">
            <button type="button" className="btn btn--primary" disabled={busy || !url.trim()} onClick={() => void send()}>
              {row.manual_preview_url ? "Send the new address" : "Send to the customer"}
            </button>
            {row.manual_preview_url && (
              <>
                <a className="btn btn--secondary" href={row.manual_preview_url} target="_blank" rel="noopener noreferrer">
                  Open what they see
                </a>
                <button type="button" className="btn btn--secondary" disabled={busy} onClick={() => void takeBack()}>
                  Take it back
                </button>
              </>
            )}
          </div>
        </>
      ) : (
        row.manual_preview_url && <p className="acct-meta">With the customer: {row.manual_preview_url}</p>
      )}
      {message && (
        <p role={message.ok ? "status" : "alert"} className="acct-meta">
          {message.text}
        </p>
      )}
    </div>
  );
}

function BriefDetail({ client, row, call, onChanged }: { client: SupabaseClient; row: BriefRow; call: Call; onChanged: () => void }) {
  // The work screen opens first: it is where the next action is. The brief, the sign-offs and the history are a tap away.
  const [tab, setTab] = useState<DetailTab>("work");
  const [events, setEvents] = useState<EventRow[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  // Whether a build is released: the live address serves only that build, so going live needs one.
  const [releasedBuild, setReleasedBuild] = useState(false);
  const [revisions, setRevisions] = useState<RevisionRow[]>([]);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    void Promise.all([
      client.from("website_brief_events").select("id, kind, detail, actor_type, actor_email, created_at").eq("brief_id", row.id).order("created_at", { ascending: false }),
      client.from("build_approvals").select("id, kind, decision, note, decided_by_email, decided_by_role, proposal_id, created_at").eq("brief_id", row.id).order("created_at", { ascending: false }),
      client.from("website_proposals").select("id, reference, status, source, summary, lines, setup_pence, monthly_pence, one_off_pence, customer_note, created_at").eq("brief_id", row.id).order("created_at", { ascending: false }),
      client.from("build_revisions").select("id, brief_id, number, status, request, response, created_at, resolved_at").eq("brief_id", row.id).order("number", { ascending: false }),
      client.from("website_site_builds").select("id").eq("brief_id", row.id).eq("status", "released").limit(1),
    ]).then(([e, a, p, r, released]) => {
      setReleasedBuild(((released.data as unknown[]) ?? []).length > 0);
      setEvents((e.data as EventRow[]) ?? []);
      setApprovals((a.data as Approval[]) ?? []);
      setProposals((p.data as Proposal[]) ?? []);
      setRevisions((r.data as RevisionRow[]) ?? []);
    });
  }, [client, row.id]);
  useEffect(load, [load]);

  const act = async (payload: Record<string, unknown>, done: string, url?: string) => {
    setBusy(true);
    setMessage(null);
    const r = await call({ briefId: row.id, ...payload }, url);
    setBusy(false);
    setMessage({ ok: r.ok && typeof r.json.note !== "string", text: r.ok ? (typeof r.json.note === "string" ? r.json.note : done) : String(r.json.error ?? "That didn't work.") });
    if (r.ok) {
      load();
      onChanged();
    }
    return r.ok;
  };

  const openFile = async (path: string) => {
    const opened = await openFileTab(async () => {
      const r = await call({ briefId: row.id, action: "file_link", path });
      return r.ok && typeof r.json.url === "string" ? r.json.url : null;
    });
    if (!opened) setMessage({ ok: false, text: "The file couldn't be opened." });
  };

  const openPack = async () => {
    const opened = await openFileTab(async () => {
      const r = await call({ briefId: row.id, action: "handover_pack" });
      if (!r.ok) setMessage({ ok: false, text: String(r.json.error ?? "The pack couldn't be made.") });
      return r.ok && typeof r.json.url === "string" ? r.json.url : null;
    });
    if (!opened) setMessage((m) => m ?? { ok: false, text: "The pack couldn't be opened." });
  };

  const state = approvalState(approvals);
  const pending = APPROVAL_ORDER.filter((k) => state[k] === "pending").length;
  const b = row.brief;
  const path = stagePath(row.route);
  const accepted = proposals.find((p) => p.status === "accepted");

  return (
    <section className="admin-order build-detail" aria-label={`Brief ${row.reference}`}>
      <div className="build-detail__head">
        <h2 className="h3">
          {row.business_name || row.name} <span className="acct-meta">{row.reference} · version {row.version}</span>
        </h2>
        {message && (
          <p role="status" className={message.ok ? "acct-meta" : "field-error"}>
            {message.text}
          </p>
        )}
      </div>

      <div className="tabs" role="tablist" aria-label="Website sections">
        {DETAIL_TABS.map((t) => (
          <button key={t.id} type="button" role="tab" id={`btab-${row.id}-${t.id}`} aria-selected={tab === t.id} aria-controls={`bpanel-${row.id}`} className="tabs__tab" onClick={() => setTab(t.id)}>
            {t.label}
            {t.id === "approvals" && pending > 0 && <span className="tabs__count">{pending}</span>}
          </button>
        ))}
      </div>

      <div id={`bpanel-${row.id}`} role="tabpanel" aria-labelledby={`btab-${row.id}-${tab}`} className="build-tabpanel">
        {tab === "brief" && (
          <div>
            <p className="admin-label">Brief</p>
            <HandoffBrief row={row} call={call} />
            <dl className="brief-summary">
              <div><dt>Customer</dt><dd>{row.name || "–"}</dd></div>
              {extrasRows(b.extras).map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd style={{ whiteSpace: "pre-line" }}>{value}</dd>
                </div>
              ))}
              {(b.site || b.otherBusinessType) && (
                <div>
                  <dt>Business type</dt>
                  <dd>
                    {b.site ? (SECTOR_PRESETS[b.site.sector]?.label ?? b.site.sector) : b.otherBusinessType}
                    {!b.site && <span className="acct-meta"> · their words</span>}
                  </dd>
                </div>
              )}
              {b.site && (() => {
                const a = b.site.answers;
                const hoursText = (a.hours ?? [])
                  .map((d) => (d.closed ? `${d.day}: closed` : d.open && d.close ? `${d.day}: ${d.open} to ${d.close}` : null))
                  .filter(Boolean)
                  .join("; ");
                const lookLabel = a.look ? a.look.charAt(0).toUpperCase() + a.look.slice(1) : "";
                const rows: [string, string][] = [
                  ["What do you offer? (services and prices)", a.servicesText ?? ""],
                  ["Opening hours", hoursText],
                  ["Phone number (optional)", a.phone ?? ""],
                  ["Email address (for replies)", a.email ?? ""],
                  ["Address", a.address ?? ""],
                  ["Areas", a.areas ?? ""],
                  ["What makes the business different", a.about ?? ""],
                  ...(SECTOR_PRESETS[b.site!.sector]?.questions ?? []).map((q): [string, string] => [q.label, a.details?.[q.id] ?? ""]),
                  ["Facts ticked (what is true of the business)", (a.highlights ?? []).map((id) => SECTOR_PRESETS[b.site!.sector]?.highlights.find((h) => h.id === id)?.value ?? id).join(", ")],
                  ["Look", lookLabel],
                  ["Colour", a.colour ?? ""],
                ];
                return rows
                  .filter(([, value]) => value)
                  .map(([label, value]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd style={{ whiteSpace: "pre-line" }}>{value}</dd>
                    </div>
                  ));
              })()}
              {!b.site && b.otherBusinessType && (
                <>
                  {b.profile.services && <div><dt>What do you offer?</dt><dd style={{ whiteSpace: "pre-line" }}>{b.profile.services}</dd></div>}
                  {b.profile.email && <div><dt>Email address (for replies)</dt><dd>{b.profile.email}</dd></div>}
                  {b.profile.phone && <div><dt>Phone number (optional)</dt><dd>{b.profile.phone}</dd></div>}
                  {b.profile.differentiator && <div><dt>What makes you different?</dt><dd>{b.profile.differentiator}</dd></div>}
                  {b.profile.customers && <div><dt>Who are your customers?</dt><dd>{CUSTOMERS[b.profile.customers]}</dd></div>}
                  {b.profile.firstActions.length > 0 && <div><dt>What should a visitor do first?</dt><dd>{b.profile.firstActions.map((a) => FIRST_ACTIONS[a]).join(", ")}</dd></div>}
                  {b.profile.areas && <div><dt>Where do you work?</dt><dd>{b.profile.areas}</dd></div>}
                  {b.profile.hours && <div><dt>Opening hours or availability</dt><dd>{b.profile.hours}</dd></div>}
                  {b.profile.about && <div><dt>About you and the business</dt><dd style={{ whiteSpace: "pre-line" }}>{b.profile.about}</dd></div>}
                  {b.profile.proof && <div><dt>Proof to show</dt><dd>{b.profile.proof}</dd></div>}
                  {b.profile.tone && <div><dt>How should the site sound?</dt><dd>{TONES[b.profile.tone]}</dd></div>}
                </>
              )}
              <div><dt>Goals</dt><dd>{b.goals.map((g) => GOALS[g]?.label ?? g).join(", ") || "–"}{b.goalNote && <><br /><span className="acct-meta">{b.goalNote}</span></>}</dd></div>
              <div><dt>Pages</dt><dd>{b.pages.join(", ")}</dd></div>
              <div><dt>Look</dt><dd>{b.style ? STYLES[b.style]?.label : "No preference"}{b.colours && ` · ${b.colours}`}</dd></div>
              {b.references.length > 0 && (
                <div><dt>Likes</dt><dd>{b.references.map((r) => <span key={r} className="build-ref">{r}</span>)}</dd></div>
              )}
              {b.avoid && <div><dt>Avoid</dt><dd>{b.avoid}</dd></div>}
              {b.functionality && <div><dt>Needs</dt><dd>{b.functionality}</dd></div>}
              <div>
                <dt>Files</dt>
                <dd>
                  {b.files.length === 0
                    ? "None"
                    : b.files.map((f) => (
                        <button key={f.path} type="button" className="arrow-link build-file" onClick={() => void openFile(f.path)}>
                          {f.name}
                        </button>
                      ))}
                </dd>
              </div>
              {row.figures.quoteReasons && row.figures.quoteReasons.length > 0 && (
                <div><dt>Quote</dt><dd>{row.figures.quoteReasons.join("; ")}</dd></div>
              )}
            </dl>
          </div>
        )}

        {tab === "work" && (
        <div className="stack" style={{ "--stack": "var(--space-5)" } as React.CSSProperties}>
          <StageControl row={row} path={path} busy={busy} onMove={(stage, note) => act({ action: "stage", stage, note }, `Moved to ${staffStageLabel(stage)}.`)} />

          {GO_LIVE_STAGES.includes(row.stage) && (
            <GoLivePanel
              row={row}
              busy={busy}
              call={call}
              qualityApproved={state.quality === "approved"}
              buildReleased={releasedBuild}
              proposalAccepted={Boolean(accepted)}
              onGoLive={(qualityChecked) => act({ action: "go-live", qualityChecked }, "The website is live.")}
            />
          )}

          <ExpectedDate key={`${row.id}:${row.expected_by ?? ""}`} row={row} busy={busy} act={act} />

          <HandBuilt row={row} call={call} onChanged={onChanged} />

          <AiPanel client={client} row={row} revisions={revisions} call={call} onChanged={onChanged} />

          <RevisionsPanel revisions={revisions} busy={busy} act={act} />

          {row.route === "proposal" && (
            <ProposalPanel key={proposals.map((p) => `${p.id}:${p.status}`).join()} proposals={proposals} busy={busy} act={act} />
          )}

          {row.route === "proposal" && row.figures.mode === "oneOff" && accepted && (
            <HandoverPanel key={`${row.balance_paid_at ?? ""}:${row.handed_over_at ?? ""}`} row={row} busy={busy} act={act} onPack={() => void openPack()} />
          )}

          {row.stage === "awaiting_payment" && (
            <div>
              <p className="admin-label">Payment link</p>
              <p className="acct-meta">
                {row.route === "proposal"
                  ? accepted
                    ? "Created from the accepted proposal's figures. The form's figures are ignored."
                    : "Waiting for the customer to accept the proposal."
                  : "Created from the catalogue price on the brief."}
              </p>
              <button
                type="button"
                className="btn btn--secondary"
                disabled={busy || (row.route === "proposal" && !accepted)}
                onClick={() =>
                  void act({ action: "create", enquiryReference: row.reference, sendEmail: true }, "Payment link created and emailed.", "/api/admin/subscriptions")
                }
              >
                Create and email payment link
              </button>
            </div>
          )}
        </div>
        )}

        {tab === "approvals" && <ApprovalsPanel state={state} approvals={approvals} busy={busy} act={act} />}
        {tab === "history" && <History events={events} busy={busy} act={act} />}
      </div>
    </section>
  );
}

function HandoverPanel({ row, busy, act, onPack }: { row: BriefRow; busy: boolean; act: (p: Record<string, unknown>, done: string) => Promise<boolean>; onPack: () => void }) {
  const [message, setMessage] = useState("");
  const [ticked, setTicked] = useState<string[]>([]);
  const day = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const complete = HANDOVER_CHECKLIST.every((item) => ticked.includes(item.id));
  const toggle = (id: string) => setTicked((t) => (t.includes(id) ? t.filter((x) => x !== id) : [...t, id]));
  return (
    <div>
      <p className="admin-label">Final payment and handover</p>
      {row.handed_over_at ? (
        <>
          <p className="acct-meta">Handed over on {day(row.handed_over_at)}. The customer can download their website pack from their account.</p>
          <button type="button" className="btn btn--secondary" disabled={busy} onClick={onPack}>
            Download the website pack
          </button>
        </>
      ) : row.balance_paid_at ? (
        <>
          <p className="acct-meta">Final payment received on {day(row.balance_paid_at)}. Download the website pack and check it, tick each item below, then hand the website over. It emails the customer. Owner or admin only.</p>
          <button type="button" className="btn btn--secondary" disabled={busy} onClick={onPack}>
            Download the website pack
          </button>
          <fieldset>
            <legend className="acct-label">Before handover</legend>
            {HANDOVER_CHECKLIST.map((item) => (
              <label key={item.id} className="acct-check">
                <input type="checkbox" checked={ticked.includes(item.id)} onChange={() => toggle(item.id)} /> {item.label}
              </label>
            ))}
          </fieldset>
          <label className="acct-label" htmlFor={`handover-${row.id}`}>
            Message to the customer <span className="optional">(optional)</span>
          </label>
          <textarea id={`handover-${row.id}`} className="acct-input" rows={3} maxLength={2000} value={message} onChange={(e) => setMessage(e.target.value)} />
          <button type="button" className="btn btn--primary" disabled={busy || !complete} onClick={() => void act({ action: "handover", note: message, checklist: ticked }, "Website handed over. The customer has been emailed.")}>
            Hand over website
          </button>
        </>
      ) : (
        <p className="acct-meta">Waiting for the customer to approve the website and pay the final 50%.</p>
      )}
    </div>
  );
}

/** The stages where a website is being checked or is live: the address can be attached from the preview on. */
const GO_LIVE_STAGES: Stage[] = ["preview", "changes", "approval", "live"];

/**
 * The one place to put a website live. It shows what is settled, takes the website's address, and gives one button.
 * Pricing and Contract are recorded for the customer once they have approved and paid; the person pressing the button
 * signs off Quality (tick) and Publication. Owner or admin only; the server checks.
 */
function GoLivePanel({
  row,
  busy,
  call,
  qualityApproved,
  buildReleased,
  proposalAccepted,
  onGoLive,
}: {
  row: BriefRow;
  busy: boolean;
  call: Call;
  qualityApproved: boolean;
  buildReleased: boolean;
  proposalAccepted: boolean;
  onGoLive: (qualityChecked: boolean) => Promise<boolean>;
}) {
  const [checked, setChecked] = useState(false);
  const [addresses, setAddresses] = useState<number | null>(null);
  const bespoke = row.route === "proposal";
  const needsFinalPayment = bespoke && row.figures.mode === "oneOff";
  const live = row.stage === "live";
  const customerApproved = row.stage === "approval" || live;
  const items: { done: boolean; text: string }[] = [
    { done: customerApproved, text: "Customer has approved their website" },
    { done: buildReleased, text: "A website build is released" },
    ...(bespoke ? [{ done: proposalAccepted, text: "Proposal accepted" }] : []),
    ...(needsFinalPayment ? [{ done: Boolean(row.balance_paid_at), text: "Final payment received" }] : []),
    { done: addresses !== null && addresses > 0, text: addresses === 0 ? "No website address attached yet" : "Website address attached" },
  ];
  // The address is the one thing that doesn't block: a website can be made live first and given its address after.
  const ready = customerApproved && buildReleased && (!bespoke || proposalAccepted) && (!needsFinalPayment || Boolean(row.balance_paid_at));
  const canPress = !live && ready && (qualityApproved || checked);
  return (
    <div className="stack" style={{ "--stack": "var(--space-3)" } as React.CSSProperties}>
      <p className="admin-label">Go live</p>
      <ul className="build-lines" role="list">
        {items.map((i) => (
          <li key={i.text}>
            {i.done ? "Done: " : "Waiting: "}
            {i.text}
          </li>
        ))}
      </ul>
      <LiveAddress briefId={row.id} stage={row.stage} call={call} answer={row.domain_choice ? { choice: row.domain_choice, name: row.domain_name } : null} onCount={setAddresses} />
      {live ? (
        <p className="acct-meta">This website is live.</p>
      ) : (
        <>
          <p className="acct-meta">Before you go live: remove the password on the website&apos;s host, then open the address in a private window to check it loads without one.</p>
          {!qualityApproved && (
            <label className="acct-check">
              <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} /> I have checked the website
            </label>
          )}
          <div className="admin-actions">
            <button type="button" className="btn btn--primary" disabled={busy || !canPress} onClick={() => void onGoLive(checked)}>
              Go live
            </button>
          </div>
          {!ready && <p className="acct-meta">Go live opens once everything above is done.</p>}
        </>
      )}
    </div>
  );
}

function StageControl({ row, path, busy, onMove }: { row: BriefRow; path: Stage[]; busy: boolean; onMove: (s: Stage, note: string) => void }) {
  const [target, setTarget] = useState<Stage>(row.stage);
  const [note, setNote] = useState("");
  const here = path.indexOf(row.stage);
  const changing = target !== row.stage;
  return (
    <div className="stage">
      <p className="admin-label">Stage</p>
      <p className="stage__now">
        {staffStageLabel(row.stage)}
        {here >= 0 && <span>Step {here + 1} of {path.length}</span>}
      </p>
      {here >= 0 && (
        <div className="stage__bar" role="img" aria-label={`Step ${here + 1} of ${path.length}: ${staffStageLabel(row.stage)}`}>
          {path.map((s, i) => (
            <span key={s} className={i < here ? "is-done" : i === here ? "is-current" : undefined} title={staffStageLabel(s)} />
          ))}
        </div>
      )}
      <div className="stage__move">
        <label htmlFor={`stage-${row.id}`} className="visually-hidden">Move to stage</label>
        <select id={`stage-${row.id}`} className="acct-input" value={target} onChange={(e) => setTarget(e.target.value as Stage)}>
          {[...path, "on_hold" as Stage, "closed" as Stage].map((s) => (
            <option key={s} value={s}>{staffStageLabel(s)}</option>
          ))}
        </select>
        <button type="button" className="btn btn--secondary" disabled={busy || !changing} onClick={() => onMove(target, note)}>
          Move
        </button>
      </div>
      {changing && (
        <input className="acct-input" placeholder="Note (optional)" value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} aria-label="Stage note" />
      )}
    </div>
  );
}

function ApprovalsPanel({
  state,
  approvals,
  busy,
  act,
}: {
  state: ReturnType<typeof approvalState>;
  approvals: Approval[];
  busy: boolean;
  act: (p: Record<string, unknown>, done: string) => Promise<boolean>;
}) {
  const [notes, setNotes] = useState<Partial<Record<ApprovalKind, string>>>({});
  // One sign-off is open at a time: the first that is still waiting.
  const [open, setOpen] = useState<ApprovalKind | null>(() => APPROVAL_ORDER.find((k) => state[k] === "pending") ?? null);
  const decide = async (kind: ApprovalKind, decision: "approved" | "rejected") => {
    const ok = await act({ action: "approve", kind, decision, note: notes[kind] ?? "" }, `${APPROVALS[kind].label} ${decision}.`);
    if (ok) setNotes((n) => ({ ...n, [kind]: "" }));
  };
  return (
    <div>
      <p className="admin-label">Approvals before launch</p>
      <ul className="build-approvals" role="list">
        {APPROVAL_ORDER.map((kind) => {
          const latest = approvals.find((a) => a.kind === kind);
          return (
            <li key={kind} className={`build-approval build-approval--${state[kind]}`}>
              <button type="button" className="build-approval__head build-approval__toggle" aria-expanded={open === kind} onClick={() => setOpen(open === kind ? null : kind)}>
                <strong>{APPROVALS[kind].label}</strong>
                <span className="build-approval__state">{state[kind] === "pending" ? "Pending" : state[kind] === "approved" ? "Approved" : "Rejected"}</span>
              </button>
              <p className="acct-meta">
                {latest
                  ? `${latest.decided_by_email} · ${when.format(new Date(latest.created_at))}${latest.note ? ` · ${latest.note}` : ""}`
                  : APPROVALS[kind].hint}
              </p>
              {open === kind && (
              <div className="build-row">
                <input
                  className="acct-input"
                  placeholder="Note (needed to reject)"
                  maxLength={2000}
                  value={notes[kind] ?? ""}
                  onChange={(e) => setNotes((n) => ({ ...n, [kind]: e.target.value }))}
                  aria-label={`${APPROVALS[kind].label} note`}
                />
                <button type="button" className="btn btn--secondary" disabled={busy} onClick={() => void decide(kind, "approved")}>
                  Approve
                </button>
                <button type="button" className="btn btn--secondary" disabled={busy || !(notes[kind] ?? "").trim()} onClick={() => void decide(kind, "rejected")}>
                  Reject
                </button>
              </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** The changes the customer asked for on their preview: what they said, and where each one has got to. */
function RevisionsPanel({ revisions, busy, act }: { revisions: RevisionRow[]; busy: boolean; act: (p: Record<string, unknown>, done: string) => Promise<boolean> }) {
  const [notes, setNotes] = useState<Record<string, string>>({});
  if (revisions.length === 0) return null;
  const waiting = revisions.filter((r) => isUnfinished(r.status)).length;
  const answer = async (r: RevisionRow, op: "start" | "done" | "decline", done: string) => {
    const ok = await act({ action: "revision", revisionId: r.id, op, note: notes[r.id] ?? "" }, done);
    if (ok) setNotes((n) => ({ ...n, [r.id]: "" }));
  };
  return (
    <div>
      <p className="admin-label">Customer changes{waiting > 0 ? ` · ${waiting} to do` : ""}</p>
      <ol className="build-revisions" role="list">
        {revisions.map((r) => (
          <li key={r.id}>
            <p className="build-revision__head">
              <strong>Change {r.number}</strong>
              <span className={`build-revision__status is-${r.status}`}>{REVISION_STATUSES[r.status]}</span>
              <span className="acct-meta">{when.format(new Date(r.created_at))}</span>
            </p>
            <p className="build-revision__text">{r.request}</p>
            {r.response && <p className="acct-meta">Our reply: {r.response}</p>}
            {isUnfinished(r.status) && (
              <div className="build-row">
                <input
                  className="acct-input"
                  placeholder="Reply to the customer (needed to decline)"
                  value={notes[r.id] ?? ""}
                  maxLength={2000}
                  onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))}
                  aria-label={`Reply to change ${r.number}`}
                />
                {r.status === "open" && (
                  <button type="button" className="btn btn--secondary" disabled={busy} onClick={() => void answer(r, "start", `Change ${r.number} started.`)}>
                    Start
                  </button>
                )}
                <button type="button" className="btn btn--secondary" disabled={busy} onClick={() => void answer(r, "done", `Change ${r.number} marked done.`)}>
                  Mark done
                </button>
                <button type="button" className="btn btn--secondary" disabled={busy || !(notes[r.id] ?? "").trim()} onClick={() => void answer(r, "decline", `Change ${r.number} declined.`)}>
                  Decline
                </button>
              </div>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

const DETAIL_TEXT = (e: EventRow): string => {
  const d = e.detail;
  switch (e.kind) {
    case "created":
      return "Brief sent";
    case "stage":
      return `Stage: ${staffStageLabel(d.from as Stage)} → ${staffStageLabel(d.to as Stage)}${d.note ? ` · ${d.note}` : ""}`;
    case "approval":
      return `${APPROVALS[d.kind as ApprovalKind]?.label ?? d.kind} ${d.decision}${d.note ? ` · ${d.note}` : ""}`;
    case "proposal":
      return `Proposal ${d.reference ?? ""} ${d.action}${d.note ? ` · ${d.note}` : ""}`;
    case "revision":
      return `Change ${d.number} ${d.action}${d.note ? ` · ${d.note}` : ""}`;
    case "preview":
      return "Customer approved the preview";
    case "note":
      return String(d.text ?? "");
    case "expected":
      return d.to ? `Expected by ${String(d.to)}` : "Expected date cleared";
    default:
      return e.kind;
  }
};

function History({ events, busy, act }: { events: EventRow[]; busy: boolean; act: (p: Record<string, unknown>, done: string) => Promise<boolean> }) {
  const [text, setText] = useState("");
  return (
    <div>
      <p className="admin-label">History</p>
      <div className="build-row">
        <input className="acct-input" placeholder="Add an internal note" value={text} maxLength={2000} onChange={(e) => setText(e.target.value)} aria-label="Internal note" />
        <button
          type="button"
          className="btn btn--secondary"
          disabled={busy || !text.trim()}
          onClick={async () => {
            if (await act({ action: "note", text }, "Note added.")) setText("");
          }}
        >
          Add
        </button>
      </div>
      <ol className="build-history" role="list">
        {events.map((e) => (
          <li key={e.id}>
            <span>{DETAIL_TEXT(e)}</span>
            <span className="acct-meta">
              {e.actor_email ?? e.actor_type} · {when.format(new Date(e.created_at))}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

type DraftLine = { label: string; amount: string; kind: ProposalLine["kind"] };

function ProposalPanel({ proposals, busy, act }: { proposals: Proposal[]; busy: boolean; act: (p: Record<string, unknown>, done: string) => Promise<boolean> }) {
  const open = proposals.find((p) => ["draft", "pending_approval", "approved", "sent"].includes(p.status));
  const [editing, setEditing] = useState(false);
  const [summary, setSummary] = useState(open?.summary ?? "");
  const [lines, setLines] = useState<DraftLine[]>(
    open?.lines.map((l) => ({ ...l, amount: String(l.amount) })) ?? [{ label: "Bespoke website design and build", amount: "", kind: "one_off" }],
  );
  const [note, setNote] = useState("");

  const save = async () => {
    const ok = await act(
      { action: "proposal_save", proposalId: open?.status === "draft" ? open.id : undefined, summary, lines: lines.map((l) => ({ ...l, amount: Number(l.amount) })) },
      "Proposal saved as a draft.",
    );
    if (ok) setEditing(false);
  };
  const op = (o: string, done: string) => act({ action: "proposal", proposalId: open?.id, op: o, note }, done).then((ok) => ok && setNote(""));

  const showForm = editing || !open;
  return (
    <div>
      <p className="admin-label">Proposal</p>
      {open && !editing && (
        <div className="build-proposal">
          <p>
            <strong>{open.reference}</strong> · {PROPOSAL_STATUSES[open.status]}
            {open.source === "ai" && <span className="cfg-tag">AI suggestion</span>}
          </p>
          {open.summary && <p className="acct-meta">{open.summary}</p>}
          <ul className="build-lines" role="list">
            {open.lines.map((l, i) => (
              <li key={i}><span>{l.label}</span><span>{money(Math.round(l.amount * 100))}{l.kind === "monthly" ? " a month" : l.kind === "setup" ? " setup" : ""}</span></li>
            ))}
          </ul>
          <div className="build-row">
            <input
              className="acct-input"
              placeholder={open.status === "pending_approval" ? "Note (needed to reject)" : "Note (optional)"}
              value={note}
              maxLength={2000}
              onChange={(e) => setNote(e.target.value)}
              aria-label="Proposal note"
            />
            {open.status === "draft" && (
              <>
                <button type="button" className="btn btn--secondary" disabled={busy} onClick={() => setEditing(true)}>Edit</button>
                <button type="button" className="btn btn--secondary" disabled={busy} onClick={() => void op("submit", "Sent for approval.")}>Submit for approval</button>
              </>
            )}
            {open.status === "pending_approval" && (
              <>
                <button type="button" className="btn btn--secondary" disabled={busy} onClick={() => void op("approve", "Pricing approved.")}>Approve pricing</button>
                <button type="button" className="btn btn--secondary" disabled={busy || !note.trim()} onClick={() => void op("reject", "Returned to draft.")}>Reject</button>
              </>
            )}
            {open.status === "approved" && (
              <button type="button" className="btn btn--primary" disabled={busy} onClick={() => void op("send", "Sent to the customer.")}>Send to customer</button>
            )}
            <button type="button" className="btn btn--secondary" disabled={busy} onClick={() => void op("withdraw", "Proposal withdrawn.")}>Withdraw</button>
          </div>
        </div>
      )}
      {showForm && (
        <div className="build-proposal stack" style={{ "--stack": "var(--space-3)" } as React.CSSProperties}>
          <textarea className="admin-textarea" rows={3} placeholder="Summary for the customer" value={summary} maxLength={4000} onChange={(e) => setSummary(e.target.value)} aria-label="Proposal summary" />
          {lines.map((l, i) => (
            <div key={i} className="build-row">
              <input className="acct-input" placeholder="Line" value={l.label} maxLength={160} aria-label={`Line ${i + 1}`} onChange={(e) => setLines((x) => x.map((y, j) => (j === i ? { ...y, label: e.target.value } : y)))} />
              <input className="acct-input build-amount" inputMode="decimal" placeholder="£" value={l.amount} aria-label={`Line ${i + 1} amount`} onChange={(e) => setLines((x) => x.map((y, j) => (j === i ? { ...y, amount: e.target.value } : y)))} />
              <select className="acct-input" value={l.kind} aria-label={`Line ${i + 1} type`} onChange={(e) => setLines((x) => x.map((y, j) => (j === i ? { ...y, kind: e.target.value as ProposalLine["kind"] } : y)))}>
                <option value="one_off">One-off</option>
                <option value="setup">Setup</option>
                <option value="monthly">Monthly</option>
              </select>
              <button type="button" className="arrow-link" onClick={() => setLines((x) => x.filter((_, j) => j !== i))} disabled={lines.length === 1}>Remove</button>
            </div>
          ))}
          <div className="build-row">
            <button type="button" className="arrow-link" onClick={() => setLines((x) => [...x, { label: "", amount: "", kind: "one_off" }])}>Add a line</button>
          </div>
          <div className="build-row">
            <button type="button" className="btn btn--primary" disabled={busy} onClick={() => void save()}>Save draft</button>
            {editing && <button type="button" className="btn btn--secondary" onClick={() => setEditing(false)}>Cancel</button>}
          </div>
          <p className="acct-meta">Drafts can be edited. Once submitted, the price is fixed until an owner or admin approves or rejects it.</p>
        </div>
      )}
      {proposals.filter((p) => p !== open).length > 0 && (
        <ul className="build-history" role="list">
          {proposals.filter((p) => p !== open).map((p) => (
            <li key={p.id}>
              <span>{p.reference} · {PROPOSAL_STATUSES[p.status]}{p.customer_note ? ` · “${p.customer_note}”` : ""}</span>
              <span className="acct-meta">{money(p.setup_pence + p.one_off_pence)}{p.monthly_pence ? ` + ${money(p.monthly_pence)} a month` : ""}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** The date the customer is shown as "Expected by". Staff set it or clear it; each change is recorded in the history. */
function ExpectedDate({ row, busy, act }: { row: BriefRow; busy: boolean; act: (p: Record<string, unknown>, done: string) => Promise<boolean> }) {
  const [value, setValue] = useState(row.expected_by ?? "");
  return (
    <div>
      <p className="admin-label">Expected by</p>
      <p className="acct-meta">Shown to the customer on their website until it is live.</p>
      <div className="admin-actions">
        <label htmlFor={`expected-${row.id}`} className="visually-hidden">Expected by</label>
        <input id={`expected-${row.id}`} type="date" className="acct-input" value={value} onChange={(e) => setValue(e.target.value)} />
        <button type="button" className="btn btn--secondary" disabled={busy || value === (row.expected_by ?? "")} onClick={() => void act({ action: "expected", date: value || null }, value ? "Expected date saved." : "Expected date cleared.")}>
          Save date
        </button>
        {row.expected_by && (
          <button type="button" className="linkbtn" disabled={busy} onClick={() => { setValue(""); void act({ action: "expected", date: null }, "Expected date cleared."); }}>
            Clear
          </button>
        )}
      </div>
    </div>
  );
}

type AiPlanRow = { id: string; version: number; cost_pence: number; model: string; created_at: string; plan?: { assumptions?: string[]; questions?: string[] } | null };
type AiSiteBuildRow = { id: string; version: number; status: "draft" | "released" | "withdrawn"; checks_ok: boolean; change_note: string; cost_pence: number; model: string; created_at: string };
type AiPreviewRow = { id: string; version: number; status: "draft" | "released" | "withdrawn"; change_note: string; cost_pence: number; model: string; created_at: string };

const pence = (n: number) => `£${(n / 100).toFixed(2)}`;

/**
 * The AI steps for one website: the AI drafts a plan from the brief, then the words for each page, and a person releases
 * the result to the customer. Nothing the AI writes reaches the customer, changes the price or goes live without staff.
 */
function AiPanel({ client, row, revisions, call, onChanged }: { client: SupabaseClient; row: BriefRow; revisions: RevisionRow[]; call: Call; onChanged: () => void }) {
  const [plans, setPlans] = useState<AiPlanRow[]>([]);
  const [previews, setPreviews] = useState<AiPreviewRow[]>([]);
  const [siteBuilds, setSiteBuilds] = useState<AiSiteBuildRow[]>([]);
  const [siteChange, setSiteChange] = useState("");
  const [regenLook, setRegenLook] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [change, setChange] = useState("");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      client.from("website_plans").select("id, version, cost_pence, model, created_at, plan").eq("brief_id", row.id).order("version", { ascending: false }),
      client.from("website_previews").select("id, version, status, change_note, cost_pence, model, created_at").eq("brief_id", row.id).order("version", { ascending: false }),
      client.from("website_site_builds").select("id, version, status, checks_ok, change_note, cost_pence, model, created_at").eq("brief_id", row.id).order("version", { ascending: false }),
    ]).then(([p, v, sb]) => {
      if (cancelled) return;
      setPlans((p.data as AiPlanRow[]) ?? []);
      setPreviews((v.data as AiPreviewRow[]) ?? []);
      setSiteBuilds((sb.data as AiSiteBuildRow[]) ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, [client, row.id, tick]);

  const run = async (key: string, payload: Record<string, unknown>, done: string) => {
    setBusy(key);
    setMessage(null);
    const r = await call(payload, "/api/admin/ai/website");
    setBusy(null);
    setMessage({ ok: r.ok, text: r.ok ? done : String(r.json.error ?? "That didn't work.") });
    if (r.ok) {
      setTick((t) => t + 1);
      onChanged();
    }
    return r;
  };

  const openPreview = async (previewId: string) => {
    const opened = await openFileTab(async () => {
      const r = await call({ action: "link", previewId }, "/api/admin/ai/website");
      return r.ok && typeof r.json.url === "string" ? r.json.url : null;
    });
    if (!opened) setMessage({ ok: false, text: "The preview couldn't be opened." });
  };

  const openSiteBuild = async (buildId: string) => {
    const opened = await openFileTab(async () => {
      const r = await call({ action: "site-link", buildId }, "/api/admin/ai/website");
      return r.ok && typeof r.json.url === "string" ? r.json.url : null;
    });
    if (!opened) setMessage({ ok: false, text: "The build couldn't be opened." });
  };

  const releaseSite = (b: AiSiteBuildRow) => {
    if (!b.checks_ok && !window.confirm("This build failed the automatic checks. Release it to the customer anyway?")) return;
    void run(`release-site-${b.id}`, { action: "site-release", buildId: b.id, override: !b.checks_ok }, "Released to the customer.");
  };

  const openChanges = revisions.filter((r) => r.status === "open" || r.status === "in_progress");
  const paid = ["specification", "building", "preview", "changes", "approval"].includes(row.stage);
  const latestPlan = plans[0];

  return (
    <div>
      <p className="admin-label">AI website</p>
      {!paid ? (
        <p className="acct-meta">Starts once the customer has paid.</p>
      ) : (
        <div className="stack" style={{ "--stack": "var(--space-3)" } as React.CSSProperties}>
          {latestPlan?.plan?.questions && latestPlan.plan.questions.length > 0 && (
            <div>
              <p className="admin-label">Questions for you</p>
              <p className="acct-meta">The writer couldn&apos;t answer these from the customer&apos;s answers. Decide them before you write the preview.</p>
              <ul className="build-lines" role="list">
                {latestPlan.plan.questions.map((q, i) => (
                  <li key={i}>
                    <span>{q}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {latestPlan?.plan?.assumptions && latestPlan.plan.assumptions.length > 0 && (
            <div>
              <p className="admin-label">Assumptions made</p>
              <ul className="build-lines" role="list">
                {latestPlan.plan.assumptions.map((a, i) => (
                  <li key={i}>
                    <span>{a}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="admin-actions">
            <button type="button" className="btn btn--secondary" disabled={busy !== null} onClick={() => void run("plan", { action: "plan", briefId: row.id }, "Plan drafted.")}>
              {busy === "plan" ? "Planning…" : latestPlan ? "Make a new plan" : "Make the plan"}
            </button>
            <button type="button" className="btn btn--secondary" disabled={busy !== null || !latestPlan} onClick={() => void run("preview", { action: "preview", briefId: row.id, change: change || undefined }, "Preview drafted.")}>
              {busy === "preview" ? "Writing pages…" : "Write the preview"}
            </button>
            <label className="acct-label">
              Style
              <select className="acct-input" value={regenLook} onChange={(e) => setRegenLook(e.target.value)} aria-label="Style for the regenerated website">
                <option value="">Chosen for me</option>
                {SITE_STYLES.map((id) => (
                  <option key={id} value={id}>{`${STYLE_INFO[id].label} (${STYLE_INFO[id].from})`}</option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="btn btn--primary"
              disabled={busy !== null}
              onClick={() => {
                if (window.confirm("Start this website again from the customer's answers? It makes a new plan, picks the template again and builds a new draft. The customer sees nothing until you release it.")) void run("regenerate", { action: "regenerate", briefId: row.id, ...(regenLook ? { look: regenLook } : {}) }, "Website regenerated. Review the new draft below.");
              }}
            >
              {busy === "regenerate" ? "Regenerating…" : "Regenerate the website"}
            </button>
          </div>
          {openChanges.length > 0 && (
            <label className="acct-label">
              Apply a customer change
              <select className="acct-input" value={change} onChange={(e) => setChange(e.target.value)}>
                <option value="">None</option>
                {openChanges.map((r) => (
                  <option key={r.id} value={r.request}>{`Change ${r.number}: ${r.request.slice(0, 60)}`}</option>
                ))}
              </select>
            </label>
          )}
          {latestPlan && <p className="acct-meta">Plan {latestPlan.version} · {pence(latestPlan.cost_pence)} · {latestPlan.model}</p>}
          {siteBuilds.length > 0 && (
            <div className="stack" style={{ "--stack": "var(--space-2)" } as React.CSSProperties}>
              <p className="admin-label">Template site</p>
              <label className="acct-label">
                Change for the next version
                <input className="acct-input" value={siteChange} maxLength={1000} onChange={(e) => setSiteChange(e.target.value)} />
              </label>
              <div className="admin-actions">
                <button type="button" className="btn btn--secondary" disabled={busy !== null} onClick={() => void run("site", { action: "site", briefId: row.id, change: siteChange || undefined }, "Site written again.")}>
                  {busy === "site" ? "Writing…" : "Write it again"}
                </button>
              </div>
              <ul className="build-revisions" role="list">
                {siteBuilds.map((b) => (
                  <li key={b.id}>
                    <p className="build-revision__head">
                      <strong>Site {b.version}</strong>
                      <span className="build-revision__status">{b.status === "released" ? "With the customer" : b.status === "draft" ? "Draft" : "Withdrawn"}</span>
                      {!b.checks_ok && <span className="build-revision__status">Failed checks</span>}
                      <span className="acct-meta">{pence(b.cost_pence)}</span>
                    </p>
                    {b.change_note && <p className="acct-meta">Change: {b.change_note}</p>}
                    <div className="admin-actions">
                      <button type="button" className="linkbtn" onClick={() => void openSiteBuild(b.id)}>View</button>
                      {b.status === "draft" && (
                        <button type="button" className="btn btn--secondary" disabled={busy !== null} onClick={() => releaseSite(b)}>
                          Release to the customer
                        </button>
                      )}
                      {b.status === "released" && (
                        <button type="button" className="btn btn--secondary" disabled={busy !== null} onClick={() => void run(`withdraw-site-${b.id}`, { action: "site-withdraw", buildId: b.id }, "Taken back.")}>
                          Withdraw
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {previews.length > 0 && (
            <ul className="build-revisions" role="list">
              {previews.map((p) => (
                <li key={p.id}>
                  <p className="build-revision__head">
                    <strong>Preview {p.version}</strong>
                    <span className="build-revision__status">{p.status === "released" ? "With the customer" : p.status === "draft" ? "Draft" : "Withdrawn"}</span>
                    <span className="acct-meta">{pence(p.cost_pence)}</span>
                  </p>
                  {p.change_note && <p className="acct-meta">Change: {p.change_note}</p>}
                  <div className="admin-actions">
                    <button type="button" className="linkbtn" onClick={() => void openPreview(p.id)}>View</button>
                    {p.status !== "released" && p.status !== "withdrawn" && (
                      <button type="button" className="btn btn--secondary" disabled={busy !== null} onClick={() => void run(`release-${p.id}`, { action: "release", previewId: p.id }, "Released to the customer.")}>
                        Release to the customer
                      </button>
                    )}
                    {p.status === "released" && (
                      <button type="button" className="btn btn--secondary" disabled={busy !== null} onClick={() => void run(`withdraw-${p.id}`, { action: "withdraw", previewId: p.id }, "Taken back.")}>
                        Withdraw
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {message && <p role={message.ok ? "status" : "alert"} className={message.ok ? "acct-meta" : "field-error"}>{message.text}</p>}
    </div>
  );
}

/**
 * The addresses a customer's live website is served on. Attaching one publishes nothing by itself: visitors see the
 * site only once the website is approved and marked live. Attach the address in Vercel and point its DNS first.
 */
function LiveAddress({ briefId, stage, call, answer, onCount }: { briefId: string; stage: string; call: Call; answer: { choice: "have" | "help"; name: string | null } | null; onCount?: (n: number) => void }) {
  const [domains, setDomains] = useState<{ hostname: string }[]>([]);
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void call({ action: "site-domains", briefId }, "/api/admin/ai/website").then((r) => {
      if (!cancelled && r.ok && Array.isArray(r.json.domains)) {
        const list = r.json.domains as { hostname: string }[];
        setDomains(list);
        onCount?.(list.length);
      }
    });
    return () => {
      cancelled = true;
    };
    // `call` is a new function on every render of the page above, so it is left out: the list reloads for another website or after a change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [briefId, tick]);

  const change = async (action: "site-domain-attach" | "site-domain-remove", hostname: string, done: string) => {
    setBusy(true);
    setMessage(null);
    const r = await call({ action, briefId, hostname }, "/api/admin/ai/website");
    setBusy(false);
    setMessage({ ok: r.ok, text: r.ok ? done : String(r.json.error ?? "That didn't work.") });
    if (r.ok) {
      setAddress("");
      setTick((t) => t + 1);
    }
  };

  return (
    <div>
      <p className="admin-label">Live address</p>
      <p className="acct-meta">{stage === "live" ? "Visitors see the website on these addresses." : "Nothing shows on these until the website is approved and live."}</p>
      {answer && (
        <p className="acct-meta">
          Customer&apos;s answer: {answer.choice === "have" ? <>they already use <strong>{answer.name}</strong>.</> : "they want help getting a web address."}
        </p>
      )}
      {domains.length > 0 && (
        <ul className="build-lines" role="list">
          {domains.map((d) => (
            <li key={d.hostname}>
              {d.hostname}{" "}
              <button type="button" className="linkbtn" disabled={busy} onClick={() => void change("site-domain-remove", d.hostname, "Address removed.")}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="admin-actions">
        <label className="visually-hidden" htmlFor={`live-address-${briefId}`}>
          Website address
        </label>
        <input id={`live-address-${briefId}`} className="input" value={address} placeholder="hartleyandsons.co.uk" maxLength={253} onChange={(e) => setAddress(e.target.value)} />
        <button type="button" className="btn btn--secondary" disabled={busy || !address.trim()} onClick={() => void change("site-domain-attach", address, "Address attached.")}>
          Attach address
        </button>
      </div>
      {message && <p role={message.ok ? "status" : "alert"} className={message.ok ? "acct-meta" : "field-error"}>{message.text}</p>}
    </div>
  );
}
