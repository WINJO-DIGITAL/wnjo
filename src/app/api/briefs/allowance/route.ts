import { NextResponse, type NextRequest } from "next/server";
import { pagesAllowedFor } from "@/lib/ai/website-ai-service";
import { serviceClient } from "@/lib/quote-store";
import { LIMITS_PER_ROUTE, sharedRateLimited } from "@/lib/rate-limit-shared";
import { customerFromRequest } from "@/lib/staff-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fail = (status: number, error: string) => NextResponse.json({ error }, { status });

/**
 * How many pages a customer's website may have: what their plan covers, or what they bought if they paid for extra.
 * The details form uses it to stop at the limit. Only the signed-in owner of the website gets an answer; the
 * server applies the same number when the details are saved.
 */
export async function POST(request: NextRequest) {
  const db = serviceClient();
  if (!db) return fail(503, "not_configured");
  const customer = await customerFromRequest(db, request.headers.get("authorization"));
  if (!customer) return fail(401, "Please sign in again.");
  const limit = LIMITS_PER_ROUTE.briefFeedback;
  if (await sharedRateLimited(db, "brief-allowance", customer.userId, limit.max, limit.windowSeconds)) return fail(429, "rate_limited");

  const body = ((await request.json().catch(() => null)) ?? {}) as { briefId?: unknown };
  const briefId = typeof body.briefId === "string" && UUID.test(body.briefId) ? body.briefId : null;
  if (!briefId) return fail(422, "invalid");

  const { data } = await db.from("website_briefs").select("email, reference, tenant_id, figures, route").eq("id", briefId).maybeSingle();
  const row = data as { email: string; reference: string; tenant_id: string; figures: { package?: string }; route: string } | null;
  if (!row || row.email.toLowerCase() !== customer.email) return fail(404, "not_found");
  return NextResponse.json({ pages: await pagesAllowedFor(db, row) });
}
