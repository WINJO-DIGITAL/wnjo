import { NextResponse, type NextRequest } from "next/server";
import { serviceClient } from "@/lib/quote-store";
import { projectAccess, userIdFromRequest } from "@/lib/files/server";
import { fileAccess } from "@/lib/files/rules";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "project-files";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Returns a short-lived download link, only to someone allowed to read this file. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: "invalid" }, { status: 422 });
  const db = serviceClient();
  if (!db) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const userId = await userIdFromRequest(db, request.headers.get("authorization"));
  if (!userId) return NextResponse.json({ error: "sign_in" }, { status: 401 });

  const { data: file } = await db
    .from("project_files")
    .select("project_id, storage_path, file_name, is_internal")
    .eq("id", id)
    .maybeSingle();
  if (!file) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const row = file as { project_id: string; storage_path: string; file_name: string; is_internal: boolean };

  const access = await projectAccess(db, userId, row.project_id);
  if (!access || !fileAccess({ isStaff: access.isStaff, isClientOfProject: access.isClient, fileIsInternal: row.is_internal }).canRead) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { data, error } = await db.storage.from(BUCKET).createSignedUrl(row.storage_path, 300, { download: row.file_name });
  if (error || !data) {
    console.error("Could not create download link");
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
  return NextResponse.json({ url: data.signedUrl, fileName: row.file_name });
}
