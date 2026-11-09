/**
 * The website build journey after a brief is sent: its stages, the four human approvals, and the bespoke proposal
 * rules. Pure, so the rules are tested here and the same checks run in the API. The database repeats the two that
 * matter most (no website goes live without all four approvals; no proposal is sent without pricing approval) in
 * triggers, so no route, script or AI agent can skip them.
 *
 * Stages from "specification" onwards are set by staff for now. The AI specification, generation and preview steps
 * arrive in later phases and will move a brief through the same stages.
 */

export const STAGES = {
  brief_received: { label: "Brief submitted", customer: "We have your brief." },
  reviewing: { label: "Under review", customer: "We're reviewing your brief." },
  proposal: { label: "Proposal", customer: "Your proposal is being prepared." },
  awaiting_payment: { label: "Payment", customer: "Ready for your first payment." },
  specification: { label: "Planning your website", customer: "We're putting your plan together." },
  building: { label: "Website generation", customer: "Your website is being generated." },
  preview: { label: "Awaiting customer review", customer: "Your private preview is ready for you to review." },
  changes: { label: "Changes requested", customer: "We're making the changes you asked for." },
  approval: { label: "Awaiting Winjo approval", customer: "Our team is checking the website before launch." },
  live: { label: "Live", customer: "Your website is live." },
  on_hold: { label: "On hold", customer: "Paused. We'll be in touch." },
  closed: { label: "Closed", customer: "This brief is closed." },
} as const;
export type Stage = keyof typeof STAGES;

export type Route = "package" | "proposal";

/** The path a brief takes. A bespoke brief has a proposal step; a standard package goes straight to payment. */
export function stagePath(route: Route): Stage[] {
  const tail: Stage[] = ["awaiting_payment", "specification", "building", "preview", "changes", "approval", "live"];
  return route === "proposal" ? ["brief_received", "reviewing", "proposal", ...tail] : ["brief_received", "reviewing", ...tail];
}

/**
 * Which route a brief takes. Anything that needs a custom quote, and any one-off website over the threshold, goes
 * through a proposal. Standard monthly packages priced from the catalogue go straight to payment.
 */
export function routeFor(figures: { mode: "monthly" | "oneOff"; oneOffTotal: number; requiresQuote: boolean }): Route {
  if (figures.requiresQuote) return "proposal";
  return "package";
}

/* ------------------------------------------------------------------ */
/* Approvals                                                           */
/* ------------------------------------------------------------------ */

export type Role = "owner" | "admin" | "staff";

export const APPROVALS = {
  quality: { label: "Quality", hint: "The website meets the brief and our standards.", roles: ["owner", "admin", "staff"] },
  pricing: { label: "Pricing", hint: "The price matches the package or the approved proposal.", roles: ["owner", "admin"] },
  contract: { label: "Contract", hint: "The agreement and terms are in place.", roles: ["owner", "admin"] },
  publication: { label: "Publication", hint: "Permission to make the website public.", roles: ["owner", "admin"] },
} as const satisfies Record<string, { label: string; hint: string; roles: readonly Role[] }>;
export type ApprovalKind = keyof typeof APPROVALS;
export const APPROVAL_ORDER: ApprovalKind[] = ["quality", "pricing", "contract", "publication"];

export type ApprovalRecord = { kind: ApprovalKind; decision: "approved" | "rejected"; created_at: string };

export function canDecide(role: Role, kind: ApprovalKind): boolean {
  return (APPROVALS[kind].roles as readonly Role[]).includes(role);
}

/** The latest decision for each approval. Decisions are never edited; a new one replaces the old in effect. */
export function approvalState(records: ApprovalRecord[]): Record<ApprovalKind, "approved" | "rejected" | "pending"> {
  const state = { quality: "pending", pricing: "pending", contract: "pending", publication: "pending" } as Record<
    ApprovalKind,
    "approved" | "rejected" | "pending"
  >;
  const sorted = [...records].sort((a, b) => a.created_at.localeCompare(b.created_at));
  for (const r of sorted) if (r.kind in state) state[r.kind] = r.decision;
  return state;
}

/**
 * Whether staff may move a brief to a stage. Returns the reason it can't, or null.
 * - Live needs all four approvals.
 * - A bespoke brief can't reach payment until its proposal is accepted.
 */
export function stageBlocker(
  target: Stage,
  ctx: { route: Route; approvals: ApprovalRecord[]; proposalAccepted: boolean },
): string | null {
  if (target === "live") {
    const state = approvalState(ctx.approvals);
    const missing = APPROVAL_ORDER.filter((k) => state[k] !== "approved");
    if (missing.length) return `Needs approval first: ${missing.map((k) => APPROVALS[k].label).join(", ")}.`;
  }
  const afterProposal: Stage[] = ["awaiting_payment", "specification", "building", "preview", "changes", "approval", "live"];
  if (ctx.route === "proposal" && afterProposal.includes(target) && !ctx.proposalAccepted) {
    return "The customer must accept an approved proposal first.";
  }
  if (target === "proposal" && ctx.route !== "proposal") return "Only bespoke briefs have a proposal stage.";
  return null;
}

/** How far along the customer's path a stage is, for the progress line. Off-path stages keep the last position. */
export function progressIndex(route: Route, stage: Stage, lastOnPath?: Stage): number {
  const path = stagePath(route);
  const i = path.indexOf(stage);
  if (i >= 0) return i;
  return lastOnPath ? Math.max(0, path.indexOf(lastOnPath)) : 0;
}

/* ------------------------------------------------------------------ */
/* Proposals                                                           */
/* ------------------------------------------------------------------ */

export const PROPOSAL_STATUSES = {
  draft: "Draft",
  pending_approval: "Awaiting approval",
  approved: "Approved",
  sent: "Sent to customer",
  accepted: "Accepted",
  declined: "Declined",
  withdrawn: "Withdrawn",
} as const;
export type ProposalStatus = keyof typeof PROPOSAL_STATUSES;

export type ProposalAction = "submit" | "approve" | "reject" | "send" | "withdraw" | "accept" | "decline";

const TRANSITIONS: Record<ProposalAction, { from: ProposalStatus[]; to: ProposalStatus; roles: (Role | "customer")[] }> = {
  submit: { from: ["draft"], to: "pending_approval", roles: ["owner", "admin", "staff"] },
  approve: { from: ["pending_approval"], to: "approved", roles: ["owner", "admin"] },
  reject: { from: ["pending_approval"], to: "draft", roles: ["owner", "admin"] },
  send: { from: ["approved"], to: "sent", roles: ["owner", "admin", "staff"] },
  withdraw: { from: ["draft", "pending_approval", "approved", "sent"], to: "withdrawn", roles: ["owner", "admin", "staff"] },
  accept: { from: ["sent"], to: "accepted", roles: ["customer"] },
  decline: { from: ["sent"], to: "declined", roles: ["customer"] },
};

/** The status a proposal moves to, or an error. Approval is always a person with an owner or admin role. */
export function proposalTransition(
  current: ProposalStatus,
  action: ProposalAction,
  actor: Role | "customer",
): { ok: true; to: ProposalStatus } | { ok: false; reason: string } {
  const t = TRANSITIONS[action];
  if (!t) return { ok: false, reason: "Unknown action." };
  if (!t.roles.includes(actor)) return { ok: false, reason: "You don't have permission to do that." };
  if (!t.from.includes(current)) return { ok: false, reason: `A ${PROPOSAL_STATUSES[current].toLowerCase()} proposal can't be changed that way.` };
  return { ok: true, to: t.to };
}

export type ProposalLine = { label: string; amount: number; kind: "setup" | "monthly" | "one_off" };

export type ProposalDraft = { summary: string; lines: ProposalLine[] };

const MAX_LINE = 100_000;

/** Cleans proposal lines from staff and totals them. Amounts in pounds, two decimal places. */
export function cleanProposal(input: unknown): { ok: true; draft: ProposalDraft; totals: { setup: number; monthly: number; oneOff: number } } | { ok: false; reason: string } {
  const o = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const summary = typeof o.summary === "string" ? o.summary.trim().slice(0, 4000) : "";
  if (!Array.isArray(o.lines) || o.lines.length === 0) return { ok: false, reason: "Add at least one line." };
  if (o.lines.length > 40) return { ok: false, reason: "Too many lines." };
  const lines: ProposalLine[] = [];
  for (const raw of o.lines) {
    const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
    const label = typeof r.label === "string" ? r.label.trim().slice(0, 160) : "";
    const amount = typeof r.amount === "number" && Number.isFinite(r.amount) ? Math.round(r.amount * 100) / 100 : NaN;
    const kind = r.kind === "setup" || r.kind === "monthly" || r.kind === "one_off" ? r.kind : null;
    if (!label || !kind || !(amount >= 0) || amount > MAX_LINE) return { ok: false, reason: "Every line needs a label, a type and an amount." };
    lines.push({ label, amount, kind });
  }
  const sum = (k: ProposalLine["kind"]) => Math.round(lines.filter((l) => l.kind === k).reduce((s, l) => s + l.amount, 0) * 100) / 100;
  const totals = { setup: sum("setup"), monthly: sum("monthly"), oneOff: sum("one_off") };
  if (totals.setup + totals.monthly + totals.oneOff <= 0) return { ok: false, reason: "The proposal has no price." };
  return { ok: true, draft: { summary, lines }, totals };
}
