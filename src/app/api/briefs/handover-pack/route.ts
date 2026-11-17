import { NextResponse, type NextRequest } from "next/server";
import { createHandoverPack, type PackBrief } from "@/lib/handover-pack-store";
import { serviceClient } from "@/lib/quote-store";
import { LIMITS_PER_ROUTE, sharedRateLimited } from "@/lib/rate-limit-shared";
import { customerFromRequest } from "@/lib/staff-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fail = (status: number, error: string) => NextResponse.json({ error }, { status });

type Row = PackBrief & { email: string; route: string };

/**
 * A download link for the website pack of a website that has been handed over to the signed-in customer. Only the
 * owner of the website gets it, and only after staff have handed it over. Anyone else, and a website not yet handed
 * over, looks like nothing is there. The link works for ten minutes; ask again for a new one.
 */
export async function POST(request: NextRequest) {
  const db = serviceClient();
  if (!db) return fail(503, "not_configured");
  const customer = await customerFromRequest(db, request.headers.get("authorization"));
  if (!customer) return fail(401, "Please sign in again.");
  const limit = LIMITS_PER_ROUTE.checkout;
  if (await sharedRateLimited(db, "brief-handover-pack", customer.userId, limit.max, limit.windowSeconds)) return fail(429, "rate_limited");

  const body = ((await request.json().catch(() => null)) ?? {}) as { briefId?: unknown };
  const briefId = typeof body.briefId === "string" && UUID.test(body.briefId) ? body.briefId : null;
  if (!briefId) return fail(422, "invalid");

  const { data } = await db
    .from("website_briefs")
    .select("id, tenant_id, reference, name, business_name, email, route, brief, handed_over_at")
    .eq("id", briefId)
    .maybeSingle();
  const brief = data as Row | null;
  if (!brief || brief.email.toLowerCase() !== customer.email || brief.route !== "proposal" || !brief.handed_over_at) return fail(404, "not_found");

  const pack = await createHandoverPack(db, brief);
  return pack.ok ? NextResponse.json({ url: pack.url }) : fail(502, pack.error);
}
