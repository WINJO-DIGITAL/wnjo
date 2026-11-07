/**
 * Shared shape and validation for enquiries (contact form and project briefs).
 * The client uses the same rules for inline feedback; the server is authoritative.
 */

/** Project types offered in the enquiry form. Keys are also used in ?topic= links. */
export const TOPICS = {
  website: "New website",
  redesign: "Website redesign",
  bespoke: "App development",
  "booking-software": "Booking software demo",
  care: "Hosting & maintenance",
  other: "Something else",
} as const;
export type Topic = keyof typeof TOPICS;

export const BUDGETS = {
  "under-2k": "Under £2,000",
  "2k-5k": "£2,000 to £5,000",
  "5k-10k": "£5,000 to £10,000",
  "10k-plus": "£10,000 or more",
  unsure: "Not sure yet",
} as const;
export type Budget = keyof typeof BUDGETS;

export const TIMELINES = {
  asap: "As soon as possible",
  "1-3m": "Within 1 to 3 months",
  "3-6m": "Within 3 to 6 months",
  flexible: "Flexible",
} as const;
export type Timeline = keyof typeof TIMELINES;

/** What happens after an enquiry is sent; shown beside the form and on its confirmation. */
export const NEXT_STEPS = [
  ["We review your enquiry", "Your goals, budget and timeline tell us how we can help."],
  ["We reply by email", "With questions, honest advice or a next step."],
  ["Discovery call", "A short conversation about your goals, if the project is a good fit."],
  ["Written scope & price", "A fixed quote to approve. Nothing to pay until you do."],
] as const;

export const LIMITS = {
  name: 100,
  email: 254,
  company: 120,
  message: 5000,
  launchDate: 60,
} as const;

/** Submissions faster than this after the form renders are treated as automated. */
export const MIN_FILL_MS = 2500;

export type EnquiryFields = {
  name: string;
  email: string;
  company: string;
  topic: Topic;
  /** Empty when not asked (project briefs carry their own answers). */
  budget: Budget | "";
  timeline: Timeline | "";
  /** The visitor's goals or message. */
  message: string;
};

export type FieldErrors = Partial<Record<keyof EnquiryFields, string>>;

const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]{2,}$/;

const own = <T extends object>(options: T, value: unknown): value is keyof T =>
  typeof value === "string" && Object.prototype.hasOwnProperty.call(options, value);

/** Removes control characters (keeps newlines and tabs) and trims. */
export function clean(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0, max);
}

export function validateEnquiry(
  input: Record<string, unknown>,
  opts: { messageRequired?: boolean; detailsRequired?: boolean } = {},
): { ok: true; data: EnquiryFields } | { ok: false; errors: FieldErrors } {
  const messageRequired = opts.messageRequired ?? true;
  const detailsRequired = opts.detailsRequired ?? false;
  const data: EnquiryFields = {
    name: clean(input.name, LIMITS.name),
    email: clean(input.email, LIMITS.email).toLowerCase(),
    company: clean(input.company, LIMITS.company),
    topic: own(TOPICS, input.topic) ? input.topic : "other",
    budget: own(BUDGETS, input.budget) ? input.budget : "",
    timeline: own(TIMELINES, input.timeline) ? input.timeline : "",
    message: clean(input.message, LIMITS.message),
  };
  const errors: FieldErrors = {};
  if (data.name.length < 2) errors.name = "Please tell us your name.";
  if (!EMAIL_RE.test(data.email)) errors.email = "Please enter a valid email address.";
  if (detailsRequired && !data.budget) errors.budget = "Please choose a budget range, or “Not sure yet”.";
  if (detailsRequired && !data.timeline) errors.timeline = "Please choose a timeline.";
  if (messageRequired && data.message.length < 10) {
    errors.message = "Please tell us a little about your goals (at least 10 characters).";
  }
  if (typeof input.message === "string" && input.message.length > LIMITS.message) {
    errors.message = `Please keep this under ${LIMITS.message.toLocaleString("en-GB")} characters.`;
  }
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, data };
}
