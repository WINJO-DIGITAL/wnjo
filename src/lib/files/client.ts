import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Browser side of project files. The file bytes go straight to private storage through a one-time link the server
 * issues; the server then checks and records the file. Downloads are a short-lived link from the server.
 */

const BUCKET = "project-files";

async function token(client: SupabaseClient): Promise<string | null> {
  const { data } = await client.auth.getSession();
  return data.session?.access_token ?? null;
}

async function post(url: string, bearer: string, body: unknown): Promise<{ ok: boolean; status: number; json: Record<string, unknown> | null }> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${bearer}` },
    body: JSON.stringify(body),
  });
  return { ok: res.ok, status: res.status, json: (await res.json().catch(() => null)) as Record<string, unknown> | null };
}

export type UploadResult = { ok: true; id: string } | { ok: false; reason: string };

export async function uploadProjectFile(client: SupabaseClient, input: { projectId: string; file: File; internal: boolean }): Promise<UploadResult> {
  const bearer = await token(client);
  if (!bearer) return { ok: false, reason: "Please sign in again." };
  const meta = { projectId: input.projectId, fileName: input.file.name, mimeType: input.file.type, sizeBytes: input.file.size, internal: input.internal };

  const link = await post("/api/files/upload-url", bearer, meta);
  if (!link.ok) return { ok: false, reason: (link.json?.reason as string) ?? "The file couldn't be uploaded. Please try again." };
  const path = link.json?.path as string;
  const signed = link.json?.token as string;

  const { error } = await client.storage.from(BUCKET).uploadToSignedUrl(path, signed, input.file, { contentType: input.file.type });
  if (error) return { ok: false, reason: "The file didn't finish uploading. Please try again." };

  const confirmed = await post("/api/files/confirm", bearer, { ...meta, path });
  if (!confirmed.ok) return { ok: false, reason: (confirmed.json?.reason as string) ?? "The file was uploaded but couldn't be recorded. Please try again." };
  return { ok: true, id: confirmed.json?.id as string };
}

export async function downloadProjectFile(client: SupabaseClient, fileId: string): Promise<boolean> {
  const bearer = await token(client);
  if (!bearer) return false;
  const res = await fetch(`/api/files/${fileId}`, { headers: { authorization: `Bearer ${bearer}` } });
  if (!res.ok) return false;
  const json = (await res.json().catch(() => null)) as { url?: string } | null;
  if (!json?.url) return false;
  window.open(json.url, "_blank", "noopener");
  return true;
}
