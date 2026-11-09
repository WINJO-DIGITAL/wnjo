import { supabase } from "./supabase";
import { validateBriefUpload, type BriefFile } from "./website-brief";

/**
 * Browser side of brief uploads. The server issues a one-time link for the draft's folder; the bytes go straight to
 * private storage. Nothing is recorded until the brief is sent, when the server checks the file is really there.
 */
export async function uploadBriefFile(draftId: string, file: File): Promise<{ ok: true; file: BriefFile } | { ok: false; reason: string }> {
  const invalid = validateBriefUpload({ fileName: file.name, mimeType: file.type, sizeBytes: file.size });
  if (invalid) return { ok: false, reason: invalid };
  const client = supabase();
  if (!client) return { ok: false, reason: "Uploads aren't available right now. You can email files to us instead." };

  const res = await fetch("/api/brief/upload-url", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ draftId, fileName: file.name, mimeType: file.type, sizeBytes: file.size }),
  }).catch(() => null);
  const json = (await res?.json().catch(() => null)) as { path?: string; token?: string; error?: string } | null;
  if (!res?.ok || !json?.path || !json.token) return { ok: false, reason: json?.error ?? "The upload couldn't start. Please try again." };

  const { error } = await client.storage.from("brief-files").uploadToSignedUrl(json.path, json.token, file, { contentType: file.type });
  if (error) return { ok: false, reason: "The file didn't finish uploading. Please try again." };
  return { ok: true, file: { path: json.path, name: file.name.slice(0, 140), size: file.size, type: file.type } };
}
