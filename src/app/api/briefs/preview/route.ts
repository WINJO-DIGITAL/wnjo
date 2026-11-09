import { NextResponse, type NextRequest } from "next/server";
import { serviceClient } from "@/lib/quote-store";
import { LIMITS_PER_ROUTE, sharedRateLimited } from "@/lib/rate-limit-shared";
import { customerFromRequest } from "@/lib/staff-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fail = (status: number, error: string) => NextResponse.json({ error }, { status });

/**
 * The private address of a customer's released preview. Only the signed-in owner of the website gets it, and only
 * for a preview a person has released. Anyone else, and a draft or withdrawn preview, looks like nothing is there.
 */
export async function POST(request: NextRequest) {
  const db = serviceClient();
  if (!db) return fail(503, "not_configured");
  const customer = await customerFromRequest(db, request.headers.get("authorization"));
  if (!customer) return fail(401, "Please sign in again.");
  const limit = LIMITS_PER_ROUTE.checkout;
  if (await sharedRateLimited(db, "brief-preview", customer.userId, limit.max, limit.windowSeconds)) return fail(429, "rate_limited");

  const body = ((await request.json().catch(() => null)) ?? {}) as { briefId?: unknown };
  const briefId = typeof body.briefId === "string" && UUID.test(body.briefId) ? body.briefId : null;
  if (!briefId) return fail(422, "invalid");

  const { data: brief } = await db.from("website_briefs").select("id, email").eq("id", briefId).maybeSingle();
  const owner = brief as { id: string; email: string } | null;
  if (!owner || owner.email.toLowerCase() !== customer.email) return fail(404, "not_found");

  const { data } = await db
    .from("website_previews")
    .select("access_token")
    .eq("brief_id", owner.id)
    .eq("status", "released")
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  const token = (data as { access_token: string } | null)?.access_token;
  if (!token) return fail(404, "not_found");
  return NextResponse.json({ url: `${new URL(request.url).origin}/preview/${token}` });
}
