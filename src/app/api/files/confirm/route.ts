import { NextResponse, type NextRequest } from "next/server";
import { serviceClient } from "@/lib/quote-store";
import { projectAccess, userIdFromRequest } from "@/lib/files/server";
import { fileAccess, pathBelongsToProject, sanitizeFileName, validateUpload } from "@/lib/files/rules";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "project-files";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Step 2 of an upload: once the browser has sent the bytes, the server checks the object really exists, is the
 * size that was declared, and sits under this project's path. Only then is the file recorded and made visible.
 */
export async function POST(request: NextRequest) {
  const db = serviceClient();
  if (!db) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const userId = await userIdFromRequest(db, request.headers.get("authorization"));
  if (!userId) return NextResponse.json({ error: "sign_in" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const projectId = typeof body?.projectId === "string" ? body.projectId : "";
  const path = typeof body?.path === "string" ? body.path : "";
  if (!UUID.test(projectId) || path.length === 0 || path.length > 512) return NextResponse.json({ error: "invalid" }, { status: 422 });
  const valid = validateUpload({ fileName: body?.fileName, mimeType: body?.mimeType, sizeBytes: body?.sizeBytes });
  if (!valid.ok) return NextResponse.json({ error: "invalid", reason: valid.reason }, { status: 422 });
  const fileName = sanitizeFileName(String(body?.fileName));
  const mimeType = String(body?.mimeType);
  const sizeBytes = Number(body?.sizeBytes);

  const access = await projectAccess(db, userId, projectId);
  if (!access) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const internal = body?.internal === true;
  if (!fileAccess({ isStaff: access.isStaff, isClientOfProject: access.isClient, fileIsInternal: null }).canUpload(internal)) {
    return NextResponse.json({ error: "not_allowed" }, { status: 403 });
  }
  if (!pathBelongsToProject(path, access.tenantId, projectId)) return NextResponse.json({ error: "invalid" }, { status: 422 });

  // The object must exist, and be the size declared. A missing or different file is refused.
  const { data: info, error: infoError } = await db.storage.from(BUCKET).info(path);
  const stored = info as { size?: number } | null;
  if (infoError || !stored || stored.size !== sizeBytes) {
    return NextResponse.json({ error: "not_uploaded" }, { status: 409 });
  }

  const { data, error } = await db
    .from("project_files")
    .insert({
      tenant_id: access.tenantId,
      project_id: projectId,
      storage_path: path,
      file_name: fileName,
      mime_type: mimeType,
      size_bytes: sizeBytes,
      is_internal: internal,
      uploaded_by: userId,
      uploaded_by_kind: access.isStaff ? "staff" : "client",
    })
    .select("id")
    .single();
  if (error || !data) {
    // A repeat confirm for the same path hits the unique path and is reported as already recorded.
    if (error?.code === "23505") return NextResponse.json({ error: "already_recorded" }, { status: 409 });
    console.error("Could not record file");
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
  return NextResponse.json({ id: (data as { id: string }).id });
}
