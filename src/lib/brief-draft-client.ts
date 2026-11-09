import { cleanDraft, type BriefDraft } from "./brief-draft";

/** Browser side of draft saving. Failures are quiet: the form keeps working and still saves on this device. */

export async function saveBriefDraft(draftId: string, draft: BriefDraft): Promise<boolean> {
  try {
    const res = await fetch("/api/brief/draft", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ draftId, draft }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function loadBriefDraft(draftId: string): Promise<BriefDraft | null> {
  try {
    const res = await fetch(`/api/brief/draft?id=${encodeURIComponent(draftId)}`, { cache: "no-store" });
    if (!res.ok) return null;
    const json = (await res.json().catch(() => null)) as { draft?: unknown } | null;
    return cleanDraft(json?.draft, draftId);
  } catch {
    return null;
  }
}
