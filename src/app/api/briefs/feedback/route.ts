import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Stage } from "@/lib/build-journey";
import { approveBlocker, cleanRevisionText, isUnfinished, requestBlocker, type RevisionStatus } from "@/lib/build-revisions";
import { mailConfig, sendEnquiryEmail } from "@/lib/mailer";
import { serviceClient } from "@/lib/quote-store";
import { LIMITS_PER_ROUTE, sharedRateLimited } from "@/lib/rate-limit-shared";
import { customerFromRequest } from "@/lib/staff-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fail = (status: number, error: string) => NextResponse.json({ error }, { status });

type Brief = { id: string; tenant_id: string; reference: string; email: string; name: string; stage: Stage };

/**
 * A customer's feedback on their website preview: ask for changes, or approve the preview. Only the person whose
 * verified email is on the brief can do either, and only while the preview is with them.
 *
 * - request_changes: saves a numbered request, and moves the build to "changes requested" if it was waiting for review.
 * - approve_preview: sends the build on for Winjo's own approvals. It is not one of the four approvals: the quality,
 *   pricing, contract and publication decisions stay with staff, and nothing is made public by this.
 */
export async function POST(request: NextRequest) {
  const db = serviceClient();
  if (!db) return fail(503, "not_configured");
  const customer = await customerFromRequest(db, request.headers.get("authorization"));
  if (!customer) return fail(401, "Please sign in again.");

  const limit = LIMITS_PER_ROUTE.briefFeedback;
  if (await sharedRateLimited(db, "brief-feedback", customer.userId, limit.max, limit.windowSeconds)) {
    return fail(429, "Too many requests. Please try again in a few minutes.");
  }

  const body = ((await request.json().catch(() => null)) ?? {}) as Record<string, unknown>;
  const briefId = typeof body.briefId === "string" && UUID.test(body.briefId) ? body.briefId : null;
  const action = body.action === "request_changes" || body.action === "approve_preview" ? body.action : null;
  if (!briefId || !action) return fail(422, "invalid");

  const { data } = await db
    .from("website_briefs")
    .select("id, tenant_id, reference, email, name, stage")
    .eq("id", briefId)
    .maybeSingle();
  const brief = data as Brief | null;
  // Someone else's website looks exactly like a missing one.
  if (!brief || brief.email.toLowerCase() !== customer.email) return fail(404, "not_found");

  const { data: open } = await db.from("build_revisions").select("id, status").eq("brief_id", brief.id);
  const rows = (open ?? []) as { id: string; status: RevisionStatus }[];
  const unfinished = rows.filter((r) => isUnfinished(r.status)).length;
  const roundsUsed = rows.length;

  const actor = { tenant_id: brief.tenant_id, brief_id: brief.id, actor_type: "customer", actor_user: customer.userId, actor_email: customer.email };
  const config = mailConfig();
  const notifyStaff = async (subject: string, lines: string[]) => {
    if (!config) return;
    await sendEnquiryEmail(config, { subject: `${subject} [${brief.reference}]`, text: lines.join("\n"), replyTo: customer.email });
  };

  if (action === "request_changes") {
    const blocked = requestBlocker(brief.stage, unfinished, roundsUsed);
    if (blocked) return fail(409, blocked);
    const text = cleanRevisionText(body.text);
    if (!text.ok) return fail(422, text.reason);

    const { data: created, error } = await db
      .from("build_revisions")
      .insert({ tenant_id: brief.tenant_id, brief_id: brief.id, request: text.text, requested_by_email: customer.email })
      .select("number")
      .single();
    if (error || !created) {
      console.error(`Revision not saved: ${error?.code ?? "unknown"}`);
      return fail(error?.code === "23505" ? 409 : 500, "Your request didn't go through. Please try again.");
    }
    const number = (created as { number: number }).number;

    const events: Record<string, unknown>[] = [{ ...actor, kind: "revision", detail: { action: "requested", number, note: text.text } }];
    if (brief.stage === "preview") {
      const { error: moveError } = await db.from("website_briefs").update({ stage: "changes" }).eq("id", brief.id).eq("stage", "preview");
      if (!moveError) events.push({ ...actor, kind: "stage", detail: { from: "preview", to: "changes" } });
    }
    await logEvents(db, events);
    await notifyStaff("Changes requested", [
      `${brief.name || customer.email} asked for change ${number} on ${brief.reference}:`,
      "",
      text.text,
      "",
      "Next: Admin, Website builds. Mark it started, done or declined (a decline needs a reason the customer can read).",
    ]);
    return NextResponse.json({ ok: true, number });
  }

  const blocked = approveBlocker(brief.stage, unfinished);
  if (blocked) return fail(409, blocked);
  const { error: moveError } = await db.from("website_briefs").update({ stage: "approval" }).eq("id", brief.id).eq("stage", "preview");
  if (moveError) return fail(409, "That didn't go through. Please refresh and try again.");
  await logEvents(db, [
    { ...actor, kind: "preview", detail: { action: "approved" } },
    { ...actor, kind: "stage", detail: { from: "preview", to: "approval" } },
  ]);
  await notifyStaff("Preview approved by the customer", [
    `${brief.name || customer.email} approved their preview of ${brief.reference}.`,
    "",
    "Next: the four approvals (quality, pricing, contract, publication) in Admin, Website builds. Nothing goes live until all four are done.",
  ]);
  return NextResponse.json({ ok: true });
}

async function logEvents(db: SupabaseClient, rows: Record<string, unknown>[]) {
  const { error } = await db.from("website_brief_events").insert(rows);
  if (error) console.error(`Brief events not recorded: ${error.code ?? "unknown"}`);
}
