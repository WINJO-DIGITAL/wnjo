/**
 * How long a customer can open a released preview. After this, the link stops working and staff re-release it if the
 * customer needs it again. Counted from the release, so a fresh release starts a new 30 days.
 */
export const PREVIEW_DAYS = 30;

/** True once a released preview is older than PREVIEW_DAYS. A draft (never released) is not expired. */
export function previewExpired(releasedAt: string | null | undefined, now = Date.now()): boolean {
  if (!releasedAt) return false;
  const released = new Date(releasedAt).getTime();
  if (Number.isNaN(released)) return true;
  return now - released > PREVIEW_DAYS * 24 * 60 * 60 * 1000;
}
