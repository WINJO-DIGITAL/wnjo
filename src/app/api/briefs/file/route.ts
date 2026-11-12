import { NextResponse, type NextRequest } from "next/server";
import { BRIEF_BUCKET } from "@/lib/brief-store";
import { serviceClient } from "@/lib/quote-store";
import { LIMITS_PER_ROUTE, sharedRateLimited } from "@/lib/rate-limit-shared";
import { customerFromRequest } from "@/lib/staff-auth";
import type { BriefFile } from "@/lib/website-brief";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fail = (status: number, error: string) => NextResponse.json({ error }, { status });
/** Types a browser can show safely in a tab. Everything else is offered as a download. */
const INLINE = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

/**
 * A short-lived link to a file the customer attached to their own website. Only the signed-in owner gets one, and only
 * for a file recorded on that website's brief. Anyone else, and any other path, looks like nothing is there.
 */
export async function POST(request: NextRequest) {
  const db = serviceClient();
  if (!db) return fail(503, "not_configured");
  const customer = await customerFromRequest(db, request.headers.get("authorization"));
  if (!customer) return fail(401, "Please sign in again.");
  const limit = LIMITS_PER_ROUTE.checkout;
  if (await sharedRateLimited(db, "brief-file", customer.userId, limit.max, limit.windowSeconds)) return fail(429, "rate_limited");

  const body = ((await request.json().catch(() => null)) ?? {}) as { briefId?: unknown; path?: unknown };
  const briefId = typeof body.briefId === "string" && UUID.test(body.briefId) ? body.briefId : null;
  const path = typeof body.path === "string" ? body.path : "";
  if (!briefId || !path) return fail(422, "invalid");

  const { data } = await db.from("website_briefs").select("email, brief").eq("id", briefId).maybeSingle();
  const row = data as { email: string; brief: { files?: BriefFile[] } | null } | null;
  if (!row || row.email.toLowerCase() !== customer.email) return fail(404, "not_found");
  const file = (row.brief?.files ?? []).find((f) => f.path === path);
  if (!file) return fail(404, "not_found");

  const { data: signed, error } = await db.storage.from(BRIEF_BUCKET).createSignedUrl(file.path, 60, INLINE.has(file.type) ? undefined : { download: file.name });
  if (error || !signed?.signedUrl) return fail(404, "not_found");
  return NextResponse.json({ url: signed.signedUrl });
}
