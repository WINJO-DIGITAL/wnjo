import { NextResponse, type NextRequest } from "next/server";
import { cleanDraft, DRAFT_LIMITS, draftTooLarge } from "@/lib/brief-draft";
import { WNJO_TENANT_ID } from "@/lib/enquiry-store";
import { serviceClient } from "@/lib/quote-store";
import { LIMITS_PER_ROUTE, sharedRateLimited } from "@/lib/rate-limit-shared";
import { DRAFT_ID_RE } from "@/lib/website-brief";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * Saves and reloads a "Build my website" draft. Nobody is signed in, so the draft id (a random UUID made in the
 * customer's browser) is the only key: anyone holding the link can read the draft, like a magic link. It is never
 * listed, answers are cleaned and size-capped on the way in and out, and requests are limited per connection.
 */

function ipOf(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export async function PUT(request: NextRequest) {
  const db = serviceClient();
  if (!db) return NextResponse.json({ error: "not_configured" }, { status: 503, headers: NO_STORE });

  const limit = LIMITS_PER_ROUTE.briefDraft;
  if (await sharedRateLimited(db, "brief-draft", ipOf(request), limit.max, limit.windowSeconds)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: NO_STORE });
  }
  // Refuse oversized bodies before reading them.
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > DRAFT_LIMITS.bytes * 2) return NextResponse.json({ error: "too_large" }, { status: 413, headers: NO_STORE });

  const body = (await request.json().catch(() => null)) as { draftId?: unknown; draft?: unknown } | null;
  const draftId = typeof body?.draftId === "string" ? body.draftId : "";
  if (!DRAFT_ID_RE.test(draftId)) return NextResponse.json({ error: "invalid" }, { status: 422, headers: NO_STORE });
  if (draftTooLarge(body?.draft)) return NextResponse.json({ error: "too_large" }, { status: 413, headers: NO_STORE });
  const draft = cleanDraft(body?.draft, draftId);
  if (!draft) return NextResponse.json({ error: "invalid" }, { status: 422, headers: NO_STORE });

  const now = new Date();
  const { error } = await db.from("website_brief_drafts").upsert(
    {
      draft_id: draftId,
      tenant_id: WNJO_TENANT_ID,
      payload: draft,
      updated_at: now.toISOString(),
      expires_at: new Date(now.getTime() + DRAFT_LIMITS.days * 24 * 60 * 60 * 1000).toISOString(),
    },
    { onConflict: "draft_id" },
  );
  if (error) {
    console.error(`Brief draft save failed: ${error.code ?? "unknown"}`);
    return NextResponse.json({ error: "failed" }, { status: 500, headers: NO_STORE });
  }

  // Housekeeping: now and then, clear out drafts that have expired. Best effort; a failure changes nothing.
  if (Math.random() < 0.05) {
    await db.from("website_brief_drafts").delete().lt("expires_at", now.toISOString());
  }
  return NextResponse.json({ ok: true }, { headers: NO_STORE });
}

export async function GET(request: NextRequest) {
  const db = serviceClient();
  if (!db) return NextResponse.json({ error: "not_configured" }, { status: 503, headers: NO_STORE });

  const limit = LIMITS_PER_ROUTE.briefDraft;
  if (await sharedRateLimited(db, "brief-draft-read", ipOf(request), limit.max, limit.windowSeconds)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: NO_STORE });
  }
  const id = request.nextUrl.searchParams.get("id") ?? "";
  if (!DRAFT_ID_RE.test(id)) return NextResponse.json({ error: "not_found" }, { status: 404, headers: NO_STORE });

  const { data } = await db
    .from("website_brief_drafts")
    .select("payload, expires_at")
    .eq("draft_id", id)
    .maybeSingle();
  const row = data as { payload: unknown; expires_at: string } | null;
  // A missing, expired or damaged draft all look the same from outside.
  if (!row || new Date(row.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: "not_found" }, { status: 404, headers: NO_STORE });
  }
  const draft = cleanDraft(row.payload, id);
  if (!draft) return NextResponse.json({ error: "not_found" }, { status: 404, headers: NO_STORE });
  return NextResponse.json({ draft }, { headers: NO_STORE });
}
