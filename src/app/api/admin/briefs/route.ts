import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { BRIEF_BUCKET } from "@/lib/brief-store";
import {
  APPROVALS,
  STAGES,
  canDecide,
  cleanProposal,
  proposalTransition,
  stageBlocker,
  type ApprovalKind,
  type ApprovalRecord,
  type ProposalAction,
  type ProposalStatus,
  type Route,
  type Stage,
} from "@/lib/build-journey";
import { notificationMailConfig, sendEmail } from "@/lib/mailer";
import { previewReadyAgainEmail, proposalReadyEmail } from "@/lib/build-emails";
import { revisionTransition, stageAfterResolve, type RevisionStatus } from "@/lib/build-revisions";
import { serviceClient } from "@/lib/quote-store";
import { staffFromRequest, type Staff } from "@/lib/staff-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const note = (v: unknown, max = 2000) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const fail = (status: number, error: string) => NextResponse.json({ error }, { status });

type Brief = { id: string; tenant_id: string; reference: string; email: string; name: string; route: Route; stage: Stage; brief: { files?: { path: string; name: string }[] } };

async function loadBrief(db: SupabaseClient, staff: Staff, id: unknown): Promise<Brief | null> {
  if (typeof id !== "string" || !UUID.test(id)) return null;
  const { data } = await db
    .from("website_briefs")
    .select("id, tenant_id, reference, email, name, route, stage, brief")
    .eq("id", id)
    .eq("tenant_id", staff.tenantId)
    .maybeSingle();
  return (data as Brief | null) ?? null;
}

async function logEvent(db: SupabaseClient, staff: Staff, briefId: string, kind: string, detail: Record<string, unknown>) {
  const { error } = await db.from("website_brief_events").insert({
    tenant_id: staff.tenantId,
    brief_id: briefId,
    kind,
    detail,
    actor_type: "staff",
    actor_user: staff.userId,
    actor_email: staff.email,
  });
  if (error) console.error(`Brief event not recorded: ${error.code ?? "unknown"}`);
}

/**
 * Staff actions on website briefs. Every action is checked against the signed-in person's role and recorded against
 * them. The database repeats the key rules, so a mistake here can't publish a website or approve a price.
 *
 * - stage: move a brief along its path (live needs all four approvals; payment on a bespoke brief needs an accepted
 *   proposal).
 * - approve: record a quality, pricing, contract or publication decision.
 * - note: add an internal note to the history.
 * - file_link: a one-minute download link for a file attached to the brief.
 * - proposal_save: create or edit a draft proposal.
 * - proposal: submit, approve, reject, send or withdraw a proposal.
 * - revision: start, finish or decline a change the customer asked for. A decline needs a reason the customer can
 *   read. When the last open change is finished the build goes back to the customer's review and they are emailed.
 */
export async function POST(request: NextRequest) {
  const db = serviceClient();
  if (!db) return fail(503, "not_configured");
  const staff = await staffFromRequest(db, request.headers.get("authorization"));
  if (!staff) return fail(401, "sign_in");
  const body = ((await request.json().catch(() => null)) ?? {}) as Record<string, unknown>;
  const brief = await loadBrief(db, staff, body.briefId);
  if (!brief) return fail(404, "not_found");

  if (body.action === "stage") {
    const target = typeof body.stage === "string" && body.stage in STAGES ? (body.stage as Stage) : null;
    if (!target) return fail(422, "Unknown stage.");
    if (target === brief.stage) return NextResponse.json({ ok: true });
    const [{ data: approvals }, { data: accepted }] = await Promise.all([
      db.from("build_approvals").select("kind, decision, created_at").eq("brief_id", brief.id),
      db.from("website_proposals").select("id").eq("brief_id", brief.id).eq("status", "accepted").limit(1),
    ]);
    const blocker = stageBlocker(target, {
      route: brief.route,
      approvals: (approvals ?? []) as ApprovalRecord[],
      proposalAccepted: (accepted ?? []).length > 0,
    });
    if (blocker) return fail(409, blocker);
    // Only an owner or admin can make a website public.
    if (target === "live" && staff.role === "staff") return fail(403, "Only an owner or admin can mark a website live.");
    const { error } = await db.from("website_briefs").update({ stage: target }).eq("id", brief.id).eq("stage", brief.stage);
    if (error) return fail(409, error.code === "42501" ? "The approvals for going live aren't complete." : "The stage couldn't be changed.");
    await logEvent(db, staff, brief.id, "stage", { from: brief.stage, to: target, note: note(body.note, 500) });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "approve") {
    const kind = typeof body.kind === "string" && body.kind in APPROVALS ? (body.kind as ApprovalKind) : null;
    const decision = body.decision === "approved" || body.decision === "rejected" ? body.decision : null;
    const text = note(body.note);
    if (!kind || !decision) return fail(422, "Choose an approval and a decision.");
    if (!canDecide(staff.role, kind)) return fail(403, `Only an owner or admin can decide ${APPROVALS[kind].label.toLowerCase()}.`);
    if (decision === "rejected" && !text) return fail(422, "Say why, so the team knows what to fix.");
    const { error } = await db.from("build_approvals").insert({
      tenant_id: staff.tenantId,
      brief_id: brief.id,
      kind,
      decision,
      note: text,
      decided_by: staff.userId,
      decided_by_email: staff.email,
      decided_by_role: staff.role,
    });
    if (error) return fail(500, "The decision couldn't be recorded.");
    await logEvent(db, staff, brief.id, "approval", { kind, decision, note: text });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "expected") {
    const raw = body.date;
    const date = raw === null || raw === "" ? null : typeof raw === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : undefined;
    if (date === undefined) return fail(422, "Choose a valid date.");
    const { error } = await db.from("website_briefs").update({ expected_by: date }).eq("id", brief.id);
    if (error) return fail(500, "The date couldn't be saved.");
    await logEvent(db, staff, brief.id, "expected", { to: date });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "note") {
    const text = note(body.text);
    if (!text) return fail(422, "Write a note first.");
    await logEvent(db, staff, brief.id, "note", { text });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "file_link") {
    const file = (brief.brief.files ?? []).find((f) => f.path === body.path);
    if (!file) return fail(404, "not_found");
    const { data, error } = await db.storage.from(BRIEF_BUCKET).createSignedUrl(file.path, 60, { download: file.name });
    if (error || !data) return fail(500, "The file couldn't be opened.");
    return NextResponse.json({ url: data.signedUrl });
  }

  if (body.action === "proposal_save") {
    if (brief.route !== "proposal") return fail(422, "Standard packages are priced from the catalogue, not a proposal.");
    const cleaned = cleanProposal(body);
    if (!cleaned.ok) return fail(422, cleaned.reason);
    const row = {
      summary: cleaned.draft.summary,
      lines: cleaned.draft.lines,
      setup_pence: Math.round(cleaned.totals.setup * 100),
      monthly_pence: Math.round(cleaned.totals.monthly * 100),
      one_off_pence: Math.round(cleaned.totals.oneOff * 100),
    };
    if (typeof body.proposalId === "string" && UUID.test(body.proposalId)) {
      const { data, error } = await db
        .from("website_proposals")
        .update(row)
        .eq("id", body.proposalId)
        .eq("brief_id", brief.id)
        .eq("status", "draft")
        .select("id");
      if (error || !data?.length) return fail(409, "Only a draft proposal can be edited.");
      await logEvent(db, staff, brief.id, "proposal", { action: "edited", proposalId: body.proposalId });
      return NextResponse.json({ ok: true, id: body.proposalId });
    }
    const { data: open } = await db
      .from("website_proposals")
      .select("id")
      .eq("brief_id", brief.id)
      .in("status", ["draft", "pending_approval", "approved", "sent"])
      .limit(1);
    if ((open ?? []).length) return fail(409, "This brief already has an open proposal. Withdraw it first.");
    const reference = `WP-${randomBytes(3).toString("hex").toUpperCase()}`;
    const { data, error } = await db
      .from("website_proposals")
      .insert({ ...row, tenant_id: staff.tenantId, brief_id: brief.id, reference, source: "staff", prepared_by: staff.userId })
      .select("id")
      .single();
    if (error || !data) return fail(500, "The proposal couldn't be saved.");
    const id = (data as { id: string }).id;
    await logEvent(db, staff, brief.id, "proposal", { action: "created", proposalId: id, reference });
    if (brief.stage === "brief_received" || brief.stage === "reviewing") {
      await db.from("website_briefs").update({ stage: "proposal" }).eq("id", brief.id);
      await logEvent(db, staff, brief.id, "stage", { from: brief.stage, to: "proposal" });
    }
    return NextResponse.json({ ok: true, id });
  }

  if (body.action === "proposal") {
    const id = typeof body.proposalId === "string" && UUID.test(body.proposalId) ? body.proposalId : null;
    const action = body.op as ProposalAction;
    if (!id || !["submit", "approve", "reject", "send", "withdraw"].includes(action)) return fail(422, "invalid");
    const { data: p } = await db
      .from("website_proposals")
      .select("id, reference, status, setup_pence, monthly_pence, one_off_pence")
      .eq("id", id)
      .eq("brief_id", brief.id)
      .maybeSingle();
    const proposal = p as { id: string; reference: string; status: ProposalStatus; setup_pence: number; monthly_pence: number; one_off_pence: number } | null;
    if (!proposal) return fail(404, "not_found");
    const step = proposalTransition(proposal.status, action, staff.role);
    if (!step.ok) return fail(403, step.reason);
    const text = note(body.note);

    if (action === "approve" || action === "reject") {
      if (action === "reject" && !text) return fail(422, "Say why, so it can be corrected.");
      // The pricing decision is the approval; the database refuses to approve a proposal without it.
      const { error: aErr } = await db.from("build_approvals").insert({
        tenant_id: staff.tenantId,
        brief_id: brief.id,
        proposal_id: proposal.id,
        kind: "pricing",
        decision: action === "approve" ? "approved" : "rejected",
        note: text,
        decided_by: staff.userId,
        decided_by_email: staff.email,
        decided_by_role: staff.role,
      });
      if (aErr) return fail(500, "The decision couldn't be recorded.");
    }
    const now = new Date().toISOString();
    const update: Record<string, unknown> = { status: step.to };
    if (action === "approve") Object.assign(update, { approved_by: staff.userId, approved_at: now });
    if (action === "send") update.sent_at = now;
    const { data: changed, error } = await db
      .from("website_proposals")
      .update(update)
      .eq("id", proposal.id)
      .eq("status", proposal.status)
      .select("id");
    if (error || !changed?.length) return fail(409, "The proposal changed in the meantime. Refresh and try again.");
    await logEvent(db, staff, brief.id, "proposal", { action, proposalId: proposal.id, reference: proposal.reference, note: text });

    if (action === "send") {
      const config = notificationMailConfig();
      if (config) {
        const site = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://winjodigital.co.uk";
        const email = proposalReadyEmail({ name: brief.name, reference: proposal.reference, accountUrl: `${site.replace(/\/+$/, "")}/account` });
        await sendEmail(config, { to: brief.email, subject: email.subject, text: email.text }, "Proposal ready");
      }
    }
    return NextResponse.json({ ok: true });
  }

  if (body.action === "revision") {
    const id = typeof body.revisionId === "string" && UUID.test(body.revisionId) ? body.revisionId : null;
    const op = body.op === "start" || body.op === "done" || body.op === "decline" ? body.op : null;
    if (!id || !op) return fail(422, "invalid");
    const { data: found } = await db.from("build_revisions").select("id, number, status").eq("id", id).eq("brief_id", brief.id).maybeSingle();
    const revision = found as { id: string; number: number; status: RevisionStatus } | null;
    if (!revision) return fail(404, "not_found");

    const text = note(body.note);
    const step = revisionTransition(revision.status, op, text);
    if (!step.ok) return fail(step.kind === "note" ? 422 : 409, step.reason);

    const finished = step.to === "done" || step.to === "declined";
    const update: Record<string, unknown> = { status: step.to };
    if (text) update.response = text;
    if (finished) Object.assign(update, { resolved_at: new Date().toISOString(), resolved_by: staff.userId });
    const { data: changed, error } = await db.from("build_revisions").update(update).eq("id", revision.id).eq("status", revision.status).select("id");
    if (error || !changed?.length) return fail(409, "This change was updated in the meantime. Refresh and try again.");
    await logEvent(db, staff, brief.id, "revision", {
      action: op === "start" ? "started" : step.to,
      number: revision.number,
      note: text,
    });

    let stage: Stage = brief.stage;
    if (finished) {
      const { data: left } = await db.from("build_revisions").select("id").eq("brief_id", brief.id).in("status", ["open", "in_progress"]);
      const back = stageAfterResolve(brief.stage, ((left ?? []) as unknown[]).length);
      if (back) {
        const { error: moveError } = await db.from("website_briefs").update({ stage: back }).eq("id", brief.id).eq("stage", brief.stage);
        if (!moveError) {
          stage = back;
          await logEvent(db, staff, brief.id, "stage", { from: brief.stage, to: back, note: "All the requested changes are finished." });
          const config = notificationMailConfig();
          if (config) {
            const site = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://winjodigital.co.uk";
            const email = previewReadyAgainEmail({ name: brief.name, reference: brief.reference, accountUrl: `${site.replace(/\/+$/, "")}/account` });
            await sendEmail(config, { to: brief.email, subject: email.subject, text: email.text }, "Changes ready");
          }
        }
      }
    }
    return NextResponse.json({ ok: true, stage });
  }

  return fail(422, "Unknown action.");
}
