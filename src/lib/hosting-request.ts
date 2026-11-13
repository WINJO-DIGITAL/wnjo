import { CARE_PLANS, type CarePlan } from "./pricing";
import { cleanDetails, validateDetails, type DetailErrors, type WebsiteDetails } from "./website-enquiry";

/**
 * The hosting-only request (/build/hosting): someone who wants us to host a website, with or without one of ours.
 * They choose a hosting plan, say where their website stands, and give their details. Nothing is charged here: the
 * request reaches the owner, who sends a secure payment link. The price shown comes from the plan, never the browser.
 */

/** The plans a hosting-only customer can choose. "none" is for websites bought outright that are hosted elsewhere. */
export const HOSTING_PLANS = ["hosting", "care", "carePlus"] as const satisfies readonly CarePlan[];
export type HostingPlan = (typeof HOSTING_PLANS)[number];

/** Where the customer's website stands, which decides what we offer next. */
export const WEBSITE_STATUS = {
  have: "I already have a website",
  need: "I need a website",
  other: "Someone else is building it",
} as const;
export type WebsiteStatus = keyof typeof WEBSITE_STATUS;

export type HostingRequest = {
  plan: HostingPlan;
  status: WebsiteStatus;
  details: WebsiteDetails;
};
export type HostingErrors = DetailErrors & { plan?: string; status?: string };

const isPlan = (v: unknown): v is HostingPlan => typeof v === "string" && (HOSTING_PLANS as readonly string[]).includes(v);
const isStatus = (v: unknown): v is WebsiteStatus => typeof v === "string" && v in WEBSITE_STATUS;

/** Checks a hosting request. Only the contact details are taken from the form; the plan and its price are looked up here. */
export function cleanHostingRequest(input: unknown): { ok: true; value: HostingRequest } | { ok: false; errors: HostingErrors } {
  const raw = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const errors: HostingErrors = {};
  if (!isPlan(raw.plan)) errors.plan = "Please choose a hosting plan.";
  if (!isStatus(raw.status)) errors.status = "Please tell us where your website is up to.";
  const details = cleanDetails(raw.details);
  Object.assign(errors, validateDetails(details, "quote", true));
  if (isStatus(raw.status) && raw.status === "have" && !details.existingWebsite) {
    errors.existingWebsite = "Please add your website address so we can connect your hosting.";
  }
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { plan: raw.plan as HostingPlan, status: raw.status as WebsiteStatus, details } };
}

/** The monthly price of a plan, in pounds, from the one price list. */
export const hostingMonthly = (plan: HostingPlan) => CARE_PLANS[plan].monthly;
