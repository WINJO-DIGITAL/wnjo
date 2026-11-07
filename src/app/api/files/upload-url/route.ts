import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { serviceClient } from "@/lib/quote-store";
import { projectAccess, userIdFromRequest } from "@/lib/files/server";
import { LIMITS_PER_ROUTE, sharedRateLimited } from "@/lib/rate-limit-shared";
import { fileAccess, storagePath, validateUpload } from "@/lib/files/rules";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "project-files";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Step 1 of an upload: checks the person may upload to this project, then issues a one-time upload link for a new
 * path. Nothing is recorded yet; the file counts once the browser confirms it has arrived.
 */
export async function POST(request: NextRequest) {
  const db = serviceClient();
  if (!db) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const userId = await userIdFromRequest(db, request.headers.get("authorization"));
  if (!userId) return NextResponse.json({ error: "sign_in" }, { status: 401 });
  const limit = LIMITS_PER_ROUTE.uploadUrl;
  if (await sharedRateLimited(db, "upload", userId, limit.max, limit.windowSeconds)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const projectId = typeof body?.projectId === "string" ? body.projectId : "";
  if (!UUID.test(projectId)) return NextResponse.json({ error: "invalid" }, { status: 422 });
  const valid = validateUpload({ fileName: body?.fileName, mimeType: body?.mimeType, sizeBytes: body?.sizeBytes });
  if (!valid.ok) return NextResponse.json({ error: "invalid", reason: valid.reason }, { status: 422 });

  const access = await projectAccess(db, userId, projectId);
  if (!access) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const internal = body?.internal === true;
  // Clients can never make an internal file: the server decides, not the form.
  if (!fileAccess({ isStaff: access.isStaff, isClientOfProject: access.isClient, fileIsInternal: null }).canUpload(internal)) {
    return NextResponse.json({ error: "not_allowed" }, { status: 403 });
  }

  const path = storagePath(access.tenantId, projectId, randomUUID(), String(body?.fileName));
  const { data, error } = await db.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) {
    console.error("Could not create upload link");
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
  return NextResponse.json({ path, token: data.token });
}
