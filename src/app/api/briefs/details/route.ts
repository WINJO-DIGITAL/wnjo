import { NextResponse, type NextRequest } from "next/server";
import { mailConfig, sendEnquiryEmail } from "@/lib/mailer";
import { serviceClient } from "@/lib/quote-store";
import { LIMITS_PER_ROUTE, sharedRateLimited } from "@/lib/rate-limit-shared";
import { customerFromRequest } from "@/lib/staff-auth";
import { BRIEF_VERSION, cleanBrief, formatBrief, validateBrief } from "@/lib/website-brief";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fail = (status: number, error: string, extra: Record<string, unknown> = {}) => NextResponse.json({ error, ...extra }, { status });

/** Stages where a brief can still be filled in or changed by the customer. After that, changes go through the preview. */
const EDITABLE_STAGES = ["brief_received", "reviewing", "awaiting_payment", "specification"];

/**
 * A customer's goals, pages and design for a website they paid for through the short checkout. Only the person whose
 * verified email is on the brief can send it, and only before the preview stage. The brief is saved as a new
 * version, so nothing is overwritten, and the build starts drafting once goals are in.
 */
export async function POST(request: NextRequest) {
  const db = serviceClient();
  if (!db) return fail(503, "not_configured");
  const customer = await customerFromRequest(db, request.headers.get("authorization"));
  if (!customer) return fail(401, "Please sign in again.");

  const limit = LIMITS_PER_ROUTE.briefFeedback;
  if (await sharedRateLimited(db, "brief-details", customer.userId, limit.max, limit.windowSeconds)) {
    return fail(429, "Too many requests. Please try again in a few minutes.");
  }

  const body = ((await request.json().catch(() => null)) ?? {}) as Record<string, unknown>;
  const briefId = typeof body.briefId === "string" && UUID.test(body.briefId) ? body.briefId : null;
  if (!briefId) return fail(422, "invalid");

  const { data } = await db
    .from("website_briefs")
    .select("id, tenant_id, reference, email, name, stage, answers")
    .eq("id", briefId)
    .maybeSingle();
  const row = data as { id: string; tenant_id: string; reference: string; email: string; name: string; stage: string; answers: unknown } | null;
  // Someone else's website looks exactly like a missing one.
  if (!row || row.email.toLowerCase() !== customer.email) return fail(404, "not_found");
  if (!EDITABLE_STAGES.includes(row.stage)) return fail(409, "This brief can't be changed now. Ask for changes on your preview instead.");

  // No file uploads here: files are not part of this form, so any sent are dropped by the cleaner (no draft folder).
  const brief = cleanBrief(body.brief);
  const errors = validateBrief(brief);
  if (Object.keys(errors).length) return fail(422, "Please complete your brief.", { brief: errors });

  const { data: last } = await db
    .from("website_brief_versions")
    .select("version")
    .eq("brief_id", row.id)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  const version = ((last as { version: number } | null)?.version ?? 0) + 1;

  const saved = { ...brief, schema: BRIEF_VERSION };
  const { error } = await db.from("website_briefs").update({ brief: saved }).eq("id", row.id).eq("stage", row.stage);
  if (error) return fail(500, "We couldn't save your brief just now. Please try again.");

  const actor = { tenant_id: row.tenant_id, brief_id: row.id, actor_type: "customer", actor_user: customer.userId, actor_email: customer.email };
  const [v, e] = await Promise.all([
    db.from("website_brief_versions").insert({
      tenant_id: row.tenant_id,
      brief_id: row.id,
      version,
      brief: saved,
      answers: row.answers ?? {},
      changed_by_type: "customer",
      changed_by_user: customer.userId,
    }),
    db.from("website_brief_events").insert({ ...actor, kind: "version", detail: { version, source: "customer_details" } }),
  ]);
  if (v.error || e.error) console.error("Brief details history save failed");

  const config = mailConfig();
  if (config) {
    await sendEnquiryEmail(config, {
      subject: `Brief details from ${row.name} [${row.reference}]`,
      text: [`${row.name} has told us about their website.`, "", formatBrief(brief)].join("\n"),
      replyTo: customer.email,
    });
  }
  return NextResponse.json({ ok: true, version });
}
