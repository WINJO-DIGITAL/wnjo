import { NextResponse, type NextRequest } from "next/server";
import { askDomain, cleanDomainAnswer } from "@/lib/domain-choice";
import type { Stage } from "@/lib/build-journey";
import { serviceClient } from "@/lib/quote-store";
import { LIMITS_PER_ROUTE, sharedRateLimited } from "@/lib/rate-limit-shared";
import { customerFromRequest } from "@/lib/staff-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fail = (status: number, error: string) => NextResponse.json({ error }, { status });

/**
 * The customer's answer to "Your website address". Only the owner of the website can answer, and only once there is a
 * preview to look at. Staff see the answer in Admin, beside the box for attaching the address.
 */
export async function POST(request: NextRequest) {
  const db = serviceClient();
  if (!db) return fail(503, "not_configured");
  const customer = await customerFromRequest(db, request.headers.get("authorization"));
  if (!customer) return fail(401, "Please sign in again.");
  const limit = LIMITS_PER_ROUTE.briefFeedback;
  if (await sharedRateLimited(db, "brief-domain", customer.userId, limit.max, limit.windowSeconds)) return fail(429, "rate_limited");

  const body = ((await request.json().catch(() => null)) ?? {}) as Record<string, unknown>;
  const briefId = typeof body.briefId === "string" && UUID.test(body.briefId) ? body.briefId : null;
  if (!briefId) return fail(422, "invalid");

  const { data } = await db.from("website_briefs").select("id, tenant_id, email, stage").eq("id", briefId).maybeSingle();
  const brief = data as { id: string; tenant_id: string; email: string; stage: Stage } | null;
  // Someone else's website looks exactly like a missing one.
  if (!brief || brief.email.toLowerCase() !== customer.email) return fail(404, "not_found");
  if (!askDomain(brief.stage)) return fail(409, "We'll ask about your web address once your preview is ready.");

  const cleaned = cleanDomainAnswer({ choice: body.choice, name: body.name });
  if (!cleaned.ok) return fail(422, cleaned.reason);

  const { error } = await db
    .from("website_briefs")
    .update({ domain_choice: cleaned.answer.choice, domain_name: cleaned.answer.name, domain_answered_at: new Date().toISOString() })
    .eq("id", brief.id);
  if (error) return fail(500, "We couldn't save that. Please try again.");

  await db.from("website_brief_events").insert({
    tenant_id: brief.tenant_id,
    brief_id: brief.id,
    kind: "note",
    detail: { domain: cleaned.answer.choice, name: cleaned.answer.name },
    actor_type: "customer",
    actor_user: customer.userId,
    actor_email: customer.email,
  });
  return NextResponse.json({ ok: true, answer: cleaned.answer });
}
