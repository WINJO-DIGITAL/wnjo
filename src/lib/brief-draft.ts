import { cleanBrief, DRAFT_ID_RE, EMPTY_BRIEF, type WebsiteBrief } from "./website-brief";
import { cleanDetails, EMPTY_DETAILS, type WebsiteDetails } from "./website-enquiry";
import { parseWebsiteAnswers, type WebsiteAnswers } from "./website-quote";

/**
 * A "Build my website" draft: everything a customer has entered so far, saved on the server so they can continue
 * from a link on any device. The browser and the server both run input through `cleanDraft`, so a stale or edited
 * draft can never put unexpected data into the form or the database.
 */

export const DRAFT_LIMITS = {
  /** Largest draft the server accepts, as JSON text. */
  bytes: 60_000,
  /** Highest step number a draft can resume at (the form clamps this to its own step count). */
  step: 20,
  /** How long an untouched draft is kept. Matches the default in the migration. */
  days: 30,
} as const;

export type BriefDraft = { answers: WebsiteAnswers; details: WebsiteDetails; brief: WebsiteBrief; step: number };

/** Returns a cleaned draft, or null if the draft id or the answers aren't valid. */
export function cleanDraft(input: unknown, draftId: string): BriefDraft | null {
  if (!DRAFT_ID_RE.test(draftId)) return null;
  if (!input || typeof input !== "object") return null;
  const raw = input as Record<string, unknown>;
  const answers = parseWebsiteAnswers(raw.answers);
  if (!answers) return null;
  const step = typeof raw.step === "number" && Number.isInteger(raw.step) ? raw.step : 0;
  return {
    answers,
    details: cleanDetails(raw.details),
    brief: raw.brief ? cleanBrief(raw.brief, draftId) : EMPTY_BRIEF,
    step: Math.min(Math.max(step, 0), DRAFT_LIMITS.step),
  };
}

/** Whether a draft has anything worth keeping: the customer has moved on or typed something. */
export function draftHasProgress(d: Pick<BriefDraft, "details" | "brief" | "step">): boolean {
  return d.step > 0 || JSON.stringify(d.details) !== JSON.stringify(EMPTY_DETAILS) || JSON.stringify(d.brief) !== JSON.stringify(EMPTY_BRIEF);
}

/** True when the draft is bigger than the server accepts. */
export function draftTooLarge(input: unknown): boolean {
  try {
    // JSON.stringify gives undefined for a missing value; that is empty, not oversized.
    return (JSON.stringify(input)?.length ?? 0) > DRAFT_LIMITS.bytes;
  } catch {
    return true;
  }
}
