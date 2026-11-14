import { NextResponse, type NextRequest } from "next/server";
import { cleanProgress, progressTooLarge } from "@/lib/brief-progress";
import { serviceClient } from "@/lib/quote-store";
import { LIMITS_PER_ROUTE, sharedRateLimited } from "@/lib/rate-limit-shared";
import { PASS_ROUTE, PASS_STAGE, briefCaller } from "@/lib/brief-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fail = (status: number, error: string) => NextResponse.json({ error }, { status });
/** The stages where the details form can still be filled in. After them, changes go through the preview. */
const EDITABLE_STAGES = ["brief_received", "reviewing", "awaiting_payment", "specification"];

/**
 * Saves and loads a customer's progress through the details form. Only the signed-in owner of the website can do
 * either, and only while the details can still be filled in.
 * - load: returns the saved progress, or null when there is none.
 * - save: replaces it. The input is cleaned first, so nothing unexpected is stored.
 * Progress is a draft: saving it never starts the AI build and never changes the brief.
 */
export async function POST(request: NextRequest) {
  const db = serviceClient();
  if (!db) return fail(503, "not_configured");
  const body = ((await request.json().catch(() => null)) ?? {}) as { briefId?: unknown; action?: unknown; progress?: unknown; pass?: unknown };
  const briefId = typeof body.briefId === "string" && UUID.test(body.briefId) ? body.briefId : null;
  if (!briefId || (body.action !== "load" && body.action !== "save")) return fail(422, "invalid");
  const caller = await briefCaller(db, request.headers.get("authorization"), body.pass, briefId);
  if (!caller) return fail(401, "Please sign in again.");
  // A pass can save progress, never read it back: reading stored details always needs a signed-in, verified email.
  if (caller.kind === "pass" && body.action !== "save") return fail(401, "Please sign in again.");
  const customer = caller.kind === "customer" ? caller : null;
  const limit = LIMITS_PER_ROUTE.briefDraft;
  if (await sharedRateLimited(db, "brief-progress", customer ? customer.userId : `pass:${briefId}`, limit.max, limit.windowSeconds)) return fail(429, "rate_limited");

  const { data } = await db.from("website_briefs").select("email, tenant_id, stage, route").eq("id", briefId).maybeSingle();
  const row = data as { email: string; tenant_id: string; stage: string; route: string } | null;
  // Someone else's website looks exactly like a missing one.
  if (!row || (customer && row.email.toLowerCase() !== customer.email)) return fail(404, "not_found");
  if (!EDITABLE_STAGES.includes(row.stage)) return fail(409, "This form can't be changed now.");
  if (!customer && (row.route !== PASS_ROUTE || row.stage !== PASS_STAGE)) return fail(401, "Please sign in to continue.");

  if (body.action === "load") {
    const { data: saved } = await db.from("website_brief_progress").select("payload, step").eq("brief_id", briefId).maybeSingle();
    const found = saved as { payload: unknown } | null;
    return NextResponse.json({ progress: found ? cleanProgress(found.payload) : null });
  }

  if (progressTooLarge(body.progress)) return fail(413, "That's too much to save at once.");
  const progress = cleanProgress(body.progress);
  if (!progress) return fail(422, "invalid");
  const { error } = await db
    .from("website_brief_progress")
    .upsert({ brief_id: briefId, tenant_id: row.tenant_id, payload: progress, step: progress.step, updated_at: new Date().toISOString() }, { onConflict: "brief_id" });
  if (error) return fail(500, "We couldn't save that just now.");
  return NextResponse.json({ ok: true });
}
