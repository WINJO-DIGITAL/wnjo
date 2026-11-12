import { NextResponse, type NextRequest } from "next/server";
import { serviceClient } from "@/lib/quote-store";
import { LIMITS_PER_ROUTE, sharedRateLimited } from "@/lib/rate-limit-shared";
import { customerFromRequest } from "@/lib/staff-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fail = (status: number, error: string) => NextResponse.json({ error }, { status });

/**
 * What the customer already told us when they signed up, so the details form doesn't ask for it again: their account
 * email, and the phone number from the sign-up form if they gave one. Only the signed-in owner of the website gets it.
 */
export async function POST(request: NextRequest) {
  const db = serviceClient();
  if (!db) return fail(503, "not_configured");
  const customer = await customerFromRequest(db, request.headers.get("authorization"));
  if (!customer) return fail(401, "Please sign in again.");
  const limit = LIMITS_PER_ROUTE.briefFeedback;
  if (await sharedRateLimited(db, "brief-known", customer.userId, limit.max, limit.windowSeconds)) return fail(429, "rate_limited");

  const body = ((await request.json().catch(() => null)) ?? {}) as { briefId?: unknown };
  const briefId = typeof body.briefId === "string" && UUID.test(body.briefId) ? body.briefId : null;
  if (!briefId) return fail(422, "invalid");

  const { data } = await db.from("website_briefs").select("email, reference, tenant_id").eq("id", briefId).maybeSingle();
  const row = data as { email: string; reference: string; tenant_id: string } | null;
  // Someone else's website looks exactly like a missing one.
  if (!row || row.email.toLowerCase() !== customer.email) return fail(404, "not_found");

  const { data: enquiry } = await db.from("enquiries").select("answers").eq("reference", row.reference).eq("tenant_id", row.tenant_id).maybeSingle();
  const answers = (enquiry as { answers: { type?: string; details?: { phone?: unknown } } | null } | null)?.answers;
  const phone = answers?.type === "website" && typeof answers.details?.phone === "string" ? answers.details.phone.trim().slice(0, 30) : "";
  return NextResponse.json({ email: row.email.toLowerCase(), phone });
}
