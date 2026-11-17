/**
 * A website the owner builds by hand is shown to the customer as an address the owner pastes in. The rules for that
 * address are here, pure, so they are tested: https only, no sign-in details in it, a real host name, a sensible length.
 */
export const MANUAL_PREVIEW_MAX = 500;

/** Stages in which a hand-built preview can be sent to, or updated for, the customer. */
export const MANUAL_PREVIEW_STAGES = ["specification", "building", "preview", "changes"] as const;

export function cleanPreviewUrl(input: unknown): { ok: true; url: string } | { ok: false; reason: string } {
  if (typeof input !== "string") return { ok: false, reason: "Paste the address of the website." };
  const text = input.trim();
  if (!text) return { ok: false, reason: "Paste the address of the website." };
  if (text.length > MANUAL_PREVIEW_MAX) return { ok: false, reason: "That address is too long." };
  if (/\s/.test(text)) return { ok: false, reason: "An address has no spaces in it." };
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return { ok: false, reason: "That doesn't look like a web address. Start it with https://" };
  }
  if (url.protocol !== "https:") return { ok: false, reason: "The address must start with https://" };
  if (url.username || url.password) return { ok: false, reason: "The address can't have a sign-in in it." };
  const host = url.hostname.toLowerCase();
  if (!host.includes(".") || host === "localhost" || /^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return { ok: false, reason: "Use the website's own address, not a local or numeric one." };
  return { ok: true, url: url.toString() };
}
