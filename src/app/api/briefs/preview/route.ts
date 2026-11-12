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

  // The newest released version wins, whether it is a words-only preview or a template build.
  const latest = (table: "website_previews" | "website_site_builds") =>
    db.from(table).select("access_token, released_at").eq("brief_id", owner.id).eq("status", "released").order("released_at", { ascending: false }).limit(1).maybeSingle();
  const [preview, site] = await Promise.all([latest("website_previews"), latest("website_site_builds")]);
  type Released = { access_token: string; released_at: string | null };
  const candidates = [
    preview.data ? { ...(preview.data as Released), path: "preview" } : null,
    site.data ? { ...(site.data as Released), path: "site-preview" } : null,
  ].filter((c): c is Released & { path: string } => c !== null);
  candidates.sort((a, b) => (b.released_at ?? "").localeCompare(a.released_at ?? ""));
  const pick = candidates[0];
  if (!pick) return fail(404, "not_found");
  return NextResponse.json({ url: `${new URL(request.url).origin}/${pick.path}/${pick.access_token}` });
}
