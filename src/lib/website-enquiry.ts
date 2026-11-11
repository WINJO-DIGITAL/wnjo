/**
 * Business details collected by the website calculator (step 6), validated the same way in the browser and on the
 * server. Messages say what to fix. Nothing here is trusted until the server has run it again.
 */
import { clean } from "./enquiry";

export const DETAIL_LIMITS = {
  name: 100,
  businessName: 120,
  email: 254,
  phone: 30,
  industry: 80,
  existingWebsite: 200,
  description: 2000,
  customers: 1000,
  launchDate: 60,
  requirements: 3000,
} as const;

export type WebsiteDetails = { [K in keyof typeof DETAIL_LIMITS]: string };

export const EMPTY_DETAILS: WebsiteDetails = {
  name: "",
  businessName: "",
  email: "",
  phone: "",
  industry: "",
  existingWebsite: "",
  description: "",
  customers: "",
  launchDate: "",
  requirements: "",
};

/**
 * The name stored when a customer pays through the short checkout, which asks for an email address only. The database
 * needs a name on every subscription; emails greet this one as "there", and the account form replaces it after payment.
 */
export const UNNAMED = "New customer";

/** What the customer chose to do with their quote (step 8). */
export const INTENTS = {
  pay: { label: "Pay and start", hint: "Pay securely with Stripe and we start your website." },
  quote: { label: "Send my quote", hint: "We review it and reply with a written proposal." },
  callback: { label: "Request a callback", hint: "We call you to talk it through. Needs a phone number." },
  consultation: { label: "Book a consultation", hint: "Pick a time for a video or phone call." },
} as const;
export type Intent = keyof typeof INTENTS;

export type DetailErrors = Partial<Record<keyof WebsiteDetails, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// UK and international numbers: digits, spaces, brackets, dashes and a leading +; at least 10 digits.
const PHONE_RE = /^\+?[\d\s()-]{10,30}$/;
const URL_RE = /^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(\/\S*)?$/i;

export function cleanDetails(input: unknown): WebsiteDetails {
  const raw = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const out = { ...EMPTY_DETAILS };
  for (const key of Object.keys(DETAIL_LIMITS) as (keyof WebsiteDetails)[]) {
    out[key] = clean(raw[key], DETAIL_LIMITS[key]);
  }
  out.email = out.email.toLowerCase();
  return out;
}

/**
 * Required: name, business name, email, industry and a short description. Phone is required for a callback.
 * The short plan checkout (`short`) needs only an email address; the rest comes in the brief after payment.
 */
export function validateDetails(details: WebsiteDetails, intent: Intent, short = false): DetailErrors {
  const errors: DetailErrors = {};
  if (details.name.length < 2) errors.name = "Please tell us your name.";
  if (details.businessName.length < 2) errors.businessName = "Please tell us your business name.";
  if (!EMAIL_RE.test(details.email)) errors.email = "Please enter a valid email address, like name@business.co.uk.";
  if (intent === "callback" && !details.phone) errors.phone = "Please add a phone number so we can call you back.";
  else if (details.phone && (!PHONE_RE.test(details.phone) || details.phone.replace(/\D/g, "").length < 10)) {
    errors.phone = "Please enter a full phone number, including the area code.";
  }
  if (!short && details.industry.length < 2) errors.industry = "Please tell us your industry, for example: hair salon.";
  if (details.existingWebsite && !URL_RE.test(details.existingWebsite)) {
    errors.existingWebsite = "Please enter a web address, like yourbusiness.co.uk, or leave it blank.";
  }
  if (!short && details.description.length < 10) errors.description = "Please describe your business in a sentence or two.";
  return errors;
}

/** Plain-text block for emails and the stored enquiry. */
export function formatDetails(details: WebsiteDetails): string {
  const row = (label: string, value: string) => (value ? [`${label}: ${value}`] : []);
  return [
    "CUSTOMER",
    ...row("Name", details.name),
    ...row("Business", details.businessName),
    ...row("Email", details.email),
    ...row("Phone", details.phone),
    ...row("Industry", details.industry),
    ...row("Existing website", details.existingWebsite),
    ...row("Launch date", details.launchDate),
    "",
    "About the business:",
    details.description,
    ...(details.customers ? ["", "Target customers:", details.customers] : []),
    ...(details.requirements ? ["", "Additional requirements:", details.requirements] : []),
  ].join("\n");
}
