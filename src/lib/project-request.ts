import { BUDGETS, TIMELINES, clean, type Budget, type Timeline } from "./enquiry";
import { CARE_PLANS, WEBSITE_PAGE_BANDS, type CarePlan, type WebsitePageBand } from "./pricing";
import { cleanBrief, validateBrief, BRIEF_LIMITS, EMPTY_BRIEF, type BriefErrors, type WebsiteBrief } from "./website-brief";
import { cleanDetails, validateDetails, type DetailErrors, type WebsiteDetails } from "./website-enquiry";
import { DEFAULT_WEBSITE_ANSWERS, websiteQuote, type WebsiteAnswers, type WebsiteQuote } from "./website-quote";

/**
 * The buy-outright request (/build/project): a short form that goes to a written proposal, then a 50% deposit. It has
 * nothing to do with the managed-plan steps. The price is never taken from the browser: the figures are rebuilt here
 * and the build is always routed to a proposal, because a project is priced from what it needs.
 */

export const NOTES_LIMIT = 500;

export type ProjectRequest = {
  details: WebsiteDetails;
  answers: WebsiteAnswers;
  brief: WebsiteBrief;
  quote: WebsiteQuote;
  budget: Budget | null;
  timeline: Timeline | null;
};
export type ProjectErrors = DetailErrors & BriefErrors & { budget?: string; timeline?: string };

const REASON = "A website project is priced in a written proposal once we know what it needs.";

export function cleanProjectRequest(input: unknown): { ok: true; value: ProjectRequest } | { ok: false; errors: ProjectErrors } {
  const raw = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const details = cleanDetails(raw.details);
  const budget = typeof raw.budget === "string" && raw.budget in BUDGETS ? (raw.budget as Budget) : null;
  const timeline = typeof raw.timeline === "string" && raw.timeline in TIMELINES ? (raw.timeline as Timeline) : null;
  const pages: WebsitePageBand = typeof raw.pages === "string" && raw.pages in WEBSITE_PAGE_BANDS ? (raw.pages as WebsitePageBand) : "4-5";
  const care: CarePlan = typeof raw.care === "string" && raw.care in CARE_PLANS ? (raw.care as CarePlan) : "none";
  const notes = clean(raw.notes, NOTES_LIMIT);

  // Their words, then the two numbers staff need first, kept together in the brief note so every screen shows them.
  const note = [
    `Budget: ${budget ? BUDGETS[budget] : "not given"}`,
    `Wanted by: ${timeline ? TIMELINES[timeline] : "not given"}`,
    ...(care !== "none" ? [`Hosting after launch: ${CARE_PLANS[care].label}`] : []),
    ...(notes ? ["", notes] : []),
  ].join("\n");
  const brief = cleanBrief({ ...EMPTY_BRIEF, goals: (raw.goals as unknown[]) ?? [], goalNote: note.slice(0, BRIEF_LIMITS.goalNote) });

  const errors: ProjectErrors = { ...validateDetails(details, "quote", true) };
  const briefErrors = validateBrief(brief);
  if (briefErrors.goals) errors.goals = briefErrors.goals;
  if (!budget) errors.budget = "Choose a budget, or Not sure yet.";
  if (!timeline) errors.timeline = "Choose when you'd like it by.";
  if (Object.keys(errors).length) return { ok: false, errors };

  const answers: WebsiteAnswers = { ...DEFAULT_WEBSITE_ANSWERS, want: "oneOff", mode: "oneOff", pages, care };
  // Always a proposal: the figures are a starting point for staff, never something the customer pays from.
  const quote: WebsiteQuote = { ...websiteQuote(answers), requiresQuote: true };
  quote.quoteReasons = [REASON, ...quote.quoteReasons.filter((r) => r !== REASON)];
  return { ok: true, value: { details, answers, brief, quote, budget, timeline } };
}
