/**
 * Extra questions for the website brief: who the customer is, what they offer, what the site must do, how it should
 * look, and what to show. All optional. Each answer is cleaned here, on the way in and on the way out, so an old or
 * edited brief can never put unexpected data into the form, the staff page or the writer.
 */

export const ROLES = { owner: "Owner", manager: "Manager", staff: "Staff member", other: "Other" } as const;
export const PRICING_STYLES = { fixed: "Fixed prices", quotes: "Quotes on request", mixed: "A mix of both" } as const;
export const JOURNEYS = { call: "A phone call", form: "An online form", walk_in: "Walking in", booking: "An online booking" } as const;
export const MEASURES = { calls: "Calls", bookings: "Bookings", enquiries: "Enquiries", sales: "Sales" } as const;
export const PHOTO_STYLES = { own: "Our own photos", stock: "Stock photos", mix: "A mix of both" } as const;
export const LEGAL = { privacy: "Privacy policy", terms: "Terms of service", cookies: "Cookie policy" } as const;

export type Role = keyof typeof ROLES;
export type PricingStyle = keyof typeof PRICING_STYLES;
export type Journey = keyof typeof JOURNEYS;
export type Measure = keyof typeof MEASURES;
export type PhotoStyle = keyof typeof PHOTO_STYLES;
export type LegalPage = keyof typeof LEGAL;

export const EXTRA_LIMITS = { short: 120, text: 300, long: 500 } as const;

export type BriefExtras = {
  role: Role | "";
  mainService: string;
  pricingStyle: PricingStyle | "";
  customerJourney: Journey | "";
  dontDo: string;
  measures: Measure[];
  existingPages: string;
  mustFind: string;
  photoStyle: PhotoStyle | "";
  wordsUse: string;
  wordsAvoid: string;
  accessibility: string;
  socials: string;
  reviews: string;
  legal: LegalPage[];
};

export const EMPTY_EXTRAS: BriefExtras = {
  role: "",
  mainService: "",
  pricingStyle: "",
  customerJourney: "",
  dontDo: "",
  measures: [],
  existingPages: "",
  mustFind: "",
  photoStyle: "",
  wordsUse: "",
  wordsAvoid: "",
  accessibility: "",
  socials: "",
  reviews: "",
  legal: [],
};

const text = (v: unknown, max: number): string =>
  typeof v === "string"
    ? v
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
        .replace(/<[^>]*>/g, "")
        .trim()
        .slice(0, max)
    : "";

const pick = <T extends string>(v: unknown, options: Record<T, string>): T | "" => (typeof v === "string" && v in options ? (v as T) : "");

const pickMany = <T extends string>(v: unknown, options: Record<T, string>): T[] =>
  Array.isArray(v) ? [...new Set(v.filter((x): x is T => typeof x === "string" && x in options))] : [];

/** Cleans extra answers. Anything missing or unknown becomes empty, so an older brief still loads. */
export function cleanExtras(input: unknown): BriefExtras {
  const o = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  return {
    role: pick<Role>(o.role, ROLES),
    mainService: text(o.mainService, EXTRA_LIMITS.short),
    pricingStyle: pick<PricingStyle>(o.pricingStyle, PRICING_STYLES),
    customerJourney: pick<Journey>(o.customerJourney, JOURNEYS),
    dontDo: text(o.dontDo, EXTRA_LIMITS.text),
    measures: pickMany<Measure>(o.measures, MEASURES),
    existingPages: text(o.existingPages, EXTRA_LIMITS.text),
    mustFind: text(o.mustFind, EXTRA_LIMITS.text),
    photoStyle: pick<PhotoStyle>(o.photoStyle, PHOTO_STYLES),
    wordsUse: text(o.wordsUse, EXTRA_LIMITS.text),
    wordsAvoid: text(o.wordsAvoid, EXTRA_LIMITS.text),
    accessibility: text(o.accessibility, EXTRA_LIMITS.text),
    socials: text(o.socials, EXTRA_LIMITS.long),
    reviews: text(o.reviews, EXTRA_LIMITS.long),
    legal: pickMany<LegalPage>(o.legal, LEGAL),
  };
}

/** Each answer as the question it answers, in form order. Empty answers are left out. */
export function extrasRows(input: unknown): [string, string][] {
  const e = cleanExtras(input);
  const rows: [string, string][] = [
    ["What is your role in the business?", e.role ? ROLES[e.role] : ""],
    ["Which service should the site lead with?", e.mainService],
    ["How do you price your work?", e.pricingStyle ? PRICING_STYLES[e.pricingStyle] : ""],
    ["How do customers usually first get in touch?", e.customerJourney ? JOURNEYS[e.customerJourney] : ""],
    ["What don't you offer?", e.dontDo],
    ["How will you know the website is working?", e.measures.map((m) => MEASURES[m]).join(", ")],
    ["Which pages do you already have?", e.existingPages],
    ["What must visitors be able to find?", e.mustFind],
    ["What kind of photos will you use?", e.photoStyle ? PHOTO_STYLES[e.photoStyle] : ""],
    ["Which words suit your business?", e.wordsUse],
    ["Which words should we avoid?", e.wordsAvoid],
    ["Are there accessibility needs?", e.accessibility],
    ["Where else are you online?", e.socials],
    ["Which reviews can we show?", e.reviews],
    ["Which legal pages do you need?", e.legal.map((l) => LEGAL[l]).join(", ")],
  ];
  return rows.filter(([, value]) => value !== "");
}
