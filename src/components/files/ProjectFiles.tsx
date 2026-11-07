"use client";

import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { downloadProjectFile, uploadProjectFile } from "@/lib/files/client";
import { MAX_FILE_BYTES } from "@/lib/files/rules";

type FileRow = { id: string; file_name: string; size_bytes: number; is_internal: boolean; created_at: string };

const day = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });

/**
 * Files for one project. The database decides what each person sees (clients get shared files only). Staff can
 * also mark an upload internal. Uploads and downloads go through the server, which checks access each time.
 */
export function ProjectFiles({ client, projectId, staff = false }: { client: SupabaseClient; projectId: string; staff?: boolean }) {
  const [files, setFiles] = useState<FileRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [internal, setInternal] = useState(false);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    client
      .from("project_files")
      .select("id, file_name, size_bytes, is_internal, created_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .then(({ data, error: err }) => {
        setFiles(err ? null : ((data as FileRow[]) ?? []));
        if (err) setError("Files couldn't be loaded.");
      });
  }, [client, projectId, refresh]);

  const onPick = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy(true);
    setError(null);
    setNote(null);
    const result = await uploadProjectFile(client, { projectId, file, internal: staff && internal });
    setBusy(false);
    if (result.ok) {
      setNote(`${file.name} is uploaded.`);
      setRefresh((r) => r + 1);
    } else {
      setError(result.reason);
    }
  };

  const open = async (id: string) => {
    setError(null);
    const ok = await downloadProjectFile(client, id);
    if (!ok) setError("That file couldn't be opened. Please try again.");
  };

  return (
    <section className="admin-stack" aria-label="Files">
      <h3 className="acct-label">Files</h3>
      {error && <p role="alert">{error}</p>}
      {note && <p role="status" className="acct-meta">{note}</p>}

      <div className="admin-stack">
        {staff && (
          <label className="acct-meta">
            <input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} /> Internal only (not shown to the client)
          </label>
        )}
        <label className="btn btn--secondary">
          {busy ? "Uploading…" : "Upload a file"}
          <input
            type="file"
            disabled={busy}
            onChange={onPick}
            accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.txt,.csv,.docx,.xlsx,.zip"
            style={{ position: "absolute", width: 1, height: 1, opacity: 0, overflow: "hidden" }}
          />
        </label>
        <p className="acct-meta">PDF, images, Word, Excel, CSV, text or ZIP. Up to {Math.round(MAX_FILE_BYTES / (1024 * 1024))} MB.</p>
      </div>

      {files?.length === 0 && <p className="acct-meta">No files yet.</p>}
      <ul className="admin-list">
        {files?.map((f) => (
          <li key={f.id} className="admin-row-static">
            <span>
              {f.file_name}
              <span className="acct-meta"> · {Math.max(1, Math.round(f.size_bytes / 1024))} KB · {day.format(new Date(f.created_at))}</span>
              {staff && <span className="acct-meta"> · {f.is_internal ? "internal" : "shared with client"}</span>}
            </span>
            <button type="button" className="btn btn--secondary" onClick={() => open(f.id)}>Download</button>
          </li>
        ))}
      </ul>
    </section>
  );
}
