import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { BRIEF_BUCKET } from "@/lib/brief-store";
import { serviceClient } from "@/lib/quote-store";
import { LIMITS_PER_ROUTE, sharedRateLimited } from "@/lib/rate-limit-shared";
import { BRIEF_LIMITS, DRAFT_ID_RE, briefUploadPath, validateBriefUpload } from "@/lib/website-brief";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * A one-time upload link for a file in a brief that hasn't been sent yet (logo, photos, documents). Nobody is
 * signed in, so it's limited per connection and per draft, the bucket is private, and the type and size are checked
 * here and again by storage. Files only count once the brief is sent and the server finds them in the draft folder.
 */
export async function POST(request: NextRequest) {
  const db = serviceClient();
  if (!db) return NextResponse.json({ error: "Uploads aren't available right now." }, { status: 503 });

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const limit = LIMITS_PER_ROUTE.briefUpload;
  if (await sharedRateLimited(db, "brief-upload", ip, limit.max, limit.windowSeconds)) {
    return NextResponse.json({ error: "Too many uploads. Please try again in a few minutes." }, { status: 429 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const draftId = typeof body?.draftId === "string" ? body.draftId : "";
  if (!DRAFT_ID_RE.test(draftId)) return NextResponse.json({ error: "Please refresh the page and try again." }, { status: 422 });
  const invalid = validateBriefUpload({ fileName: body?.fileName, mimeType: body?.mimeType, sizeBytes: body?.sizeBytes });
  if (invalid) return NextResponse.json({ error: invalid }, { status: 422 });

  const { data: existing } = await db.storage.from(BRIEF_BUCKET).list(`drafts/${draftId}`, { limit: 100 });
  if ((existing?.length ?? 0) >= BRIEF_LIMITS.files) {
    return NextResponse.json({ error: `You can attach up to ${BRIEF_LIMITS.files} files.` }, { status: 422 });
  }

  const path = briefUploadPath(draftId, randomUUID().slice(0, 8), String(body?.fileName));
  const { data, error } = await db.storage.from(BRIEF_BUCKET).createSignedUploadUrl(path);
  if (error || !data) {
    console.error("Could not create brief upload link");
    return NextResponse.json({ error: "The upload couldn't start. Please try again." }, { status: 500 });
  }
  return NextResponse.json({ path, token: data.token });
}
