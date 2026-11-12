import { cleanBrief, DRAFT_ID_RE, type WebsiteBrief } from "./website-brief";
import { STEP_IDS, type StepId } from "./brief-steps";

/**
 * A customer's progress through the details form, saved on the server so an accidental close loses only the step they
 * were on. Everything goes through `cleanProgress` on the way in, so a stale or edited save can never put unexpected
 * data into the form. It is separate from the brief itself: saving progress never starts the AI build.
 */

export const PROGRESS_LIMITS = { bytes: 60_000, name: 100, businessName: 120 } as const;

export type Progress = { name: string; businessName: string; brief: WebsiteBrief; step: StepId; draftId: string | null };

const text = (v: unknown, max: number) =>
  typeof v === "string"
    ? v
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
        .replace(/<[^>]*>/g, "")
        .trim()
        .slice(0, max)
    : "";

/** Returns cleaned progress, or null if it isn't an object. Uploaded files are kept only under this form's own folder. */
export function cleanProgress(input: unknown): Progress | null {
  if (!input || typeof input !== "object") return null;
  const o = input as Record<string, unknown>;
  const draftId = typeof o.draftId === "string" && DRAFT_ID_RE.test(o.draftId) ? o.draftId : null;
  const step = typeof o.step === "string" && (STEP_IDS as readonly string[]).includes(o.step) ? (o.step as StepId) : "about";
  return {
    name: text(o.name, PROGRESS_LIMITS.name),
    businessName: text(o.businessName, PROGRESS_LIMITS.businessName),
    brief: cleanBrief(o.brief, draftId ?? undefined),
    step,
    draftId,
  };
}

/** True when the save is bigger than the server accepts. */
export function progressTooLarge(input: unknown): boolean {
  try {
    return (JSON.stringify(input)?.length ?? 0) > PROGRESS_LIMITS.bytes;
  } catch {
    return true;
  }
}
