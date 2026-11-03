/**
 * The single, authoritative source of WNJO pricing rules (README §7, §8, §13).
 *
 * Both the browser (live estimate) and the server (enquiry validation) import this
 * module, so a price is never calculated in two places. Browser-side results are
 * informational; the API route recalculates from the submitted answers.
 *
 * STATUS: PROVISIONAL. Every figure below is a working assumption for the first
 * release and has not been commercially validated. `PRICING_STATUS` drives the
 * notice shown wherever prices appear. Change it to "confirmed" only once the
 * figures, deliverables and VAT treatment are signed off.
 */

export const PRICING_STATUS: "provisional" | "confirmed" = "provisional";
export const CURRENCY = "GBP";
export const VAT_NOTE = "Prices exclude VAT. VAT treatment is still to be confirmed.";

/* ------------------------------------------------------------------ */
/* Option catalogue                                                    */
/* ------------------------------------------------------------------ */

export const PROJECT_TYPES = {
  business: { label: "Business website", hint: "Present your services and win enquiries." },
  portfolio: { label: "Portfolio website", hint: "Showcase work, people or a creative practice." },
  shop: { label: "Online shop", hint: "Sell products with secure online payments." },
  booking: { label: "Booking website", hint: "Let customers book appointments or services." },
  webapp: { label: "Bespoke web application", hint: "Custom software with its own logic and data." },
  unsure: { label: "Not sure yet", hint: "Tell us the goal and we'll recommend an approach." },
} as const;
export type ProjectType = keyof typeof PROJECT_TYPES;

export const PAGE_BANDS = {
  "1-5": { label: "Up to 5 pages", maxPages: 5 },
  "6-12": { label: "6 to 12 pages", maxPages: 12 },
  "13-25": { label: "13 to 25 pages", maxPages: 25 },
  "26+": { label: "More than 25 pages", maxPages: null },
} as const;
export type PageBand = keyof typeof PAGE_BANDS;

export const COPY_OPTIONS = {
  provided: { label: "I'll provide all the words", hint: "Ready-to-use copy for every page." },
  editing: { label: "I have drafts that need polishing", hint: "We edit and structure your drafts." },
  writing: { label: "Please write it for me", hint: "Copywriting based on a short interview." },
} as const;
export type CopyOption = keyof typeof COPY_OPTIONS;

export const IMAGERY_OPTIONS = {
  provided: { label: "I have photography I can use" },
  sourced: { label: "Please source licensed imagery" },
} as const;
export type ImageryOption = keyof typeof IMAGERY_OPTIONS;

export const FEATURES = {
  cms: {
    label: "Content management",
    hint: "Edit pages and posts yourself without a developer.",
  },
  payments: { label: "Online payments", hint: "Take deposits or one-off payments through a payment provider." },
  booking: { label: "Booking functionality", hint: "Availability, appointments and confirmations." },
  ecommerce: { label: "E-commerce catalogue", hint: "Products, basket, checkout and order management." },
  accounts: { label: "Customer accounts", hint: "Sign-in areas for your customers." },
  integrations: {
    label: "Third-party integrations",
    hint: "Connect a CRM, mailing list, calendar or other service.",
  },
  custom: { label: "Custom features", hint: "Something specific to your business. Describe it later." },
} as const;
export type Feature = keyof typeof FEATURES;

export const BRANDING_OPTIONS = {
  established: { label: "We have an established brand", hint: "Logo, colours and type are settled." },
  partial: { label: "We have a logo, little else", hint: "We extend it into a usable web palette." },
  none: { label: "We're starting from scratch", hint: "We create a simple visual identity for the web." },
} as const;
export type BrandingOption = keyof typeof BRANDING_OPTIONS;

export const DESIGN_LEVELS = {
  refined: {
    label: "Refined",
    hint: "Bespoke design with clean, considered layouts and restrained motion.",
  },
  distinctive: {
    label: "Distinctive",
    hint: "More art direction, custom layouts per page and richer interaction.",
  },
  signature: {
    label: "Signature",
    hint: "A highly crafted experience with bespoke interactions throughout.",
  },
} as const;
export type DesignLevel = keyof typeof DESIGN_LEVELS;

export const CARE_PLANS = {
  none: {
    label: "No plan",
    monthly: 0,
    summary: "We hand the site over to your own hosting.",
    includes: [] as string[],
  },
  hosting: {
    label: "Hosting",
    monthly: 25,
    summary: "Managed hosting for your site.",
    includes: ["Managed hosting", "SSL certificate", "Daily backups", "Uptime monitoring"],
  },
  care: {
    label: "Care",
    monthly: 75,
    summary: "Hosting plus routine maintenance and small changes.",
    includes: [
      "Everything in Hosting",
      "Routine updates",
      "Up to 1 hour of small content changes per month",
      "Email support, replies within 2 working days",
    ],
  },
  carePlus: {
    label: "Care Plus",
    monthly: 180,
    summary: "For sites that change often or carry more functionality.",
    includes: [
      "Everything in Care",
      "Up to 3 hours of changes or improvements per month",
      "Quarterly performance and accessibility review",
      "Email support, replies within 1 working day",
    ],
  },
} as const;
export type CarePlan = keyof typeof CARE_PLANS;

export const TIMING_OPTIONS = {
  flexible: { label: "Flexible", hint: "No fixed deadline." },
  quarter: { label: "Within about 3 months" },
  soon: { label: "Within about 6 weeks", hint: "Subject to availability. May carry a scheduling premium." },
  date: { label: "A specific date", hint: "Tell us the date and why it matters." },
} as const;
export type TimingOption = keyof typeof TIMING_OPTIONS;

/* ------------------------------------------------------------------ */
/* Packages                                                            */
/* ------------------------------------------------------------------ */

export const PACKAGES = {
  essential: {
    name: "Essential",
    from: 1800,
    pageLimit: 5,
    summary: "A polished, professional web presence.",
    includes: [
      "Up to 5 pages",
      "Bespoke visual direction",
      "Responsive build for mobile, tablet and desktop",
      "Enquiry form",
      "Technical SEO foundations",
      "Two rounds of design revisions",
      "Launch and 30 days of handover support",
    ],
  },
  professional: {
    name: "Professional",
    from: 3800,
    pageLimit: 12,
    summary: "A fuller marketing site with richer presentation.",
    includes: [
      "Up to 12 pages",
      "Custom layouts for key pages",
      "Service and project presentation",
      "Content management",
      "Analytics set-up",
      "Three rounds of design revisions",
      "Launch and 30 days of handover support",
    ],
  },
  premium: {
    name: "Premium",
    from: 7500,
    pageLimit: 25,
    summary: "A distinctive experience or more advanced functionality.",
    includes: [
      "Up to 25 pages",
      "Extensive custom design and interaction",
      "Complex page structures",
      "Content management",
      "Integration planning",
      "Extended cross-browser and accessibility testing",
      "Launch and 60 days of handover support",
    ],
  },
} as const;
export type PackageId = keyof typeof PACKAGES;

/* ------------------------------------------------------------------ */
/* Rates (provisional)                                                 */
/* ------------------------------------------------------------------ */

const RATES = {
  copy: {
    editing: { "1-5": 350, "6-12": 700, "13-25": 1300 },
    writing: { "1-5": 750, "6-12": 1500, "13-25": 2800 },
  },
  imagerySourcing: 250,
  features: {
    cms: 600,
    payments: 500,
    booking: 1500,
    ecommerce: 2500,
    accounts: 1200,
    integrations: 600,
    custom: 0, // priced only after scope confirmation
  } satisfies Record<Feature, number>,
  branding: { established: 0, partial: 300, none: 650 },
  design: { refined: 0, distinctive: 900, signature: 2400 },
  soonPremium: 0.15,
  /** Upper end of the indicative range, relative to the calculated figure. */
  rangeSpread: 0.2,
} as const;

/** Features already included in a package, so they are never charged twice. */
const INCLUDED_FEATURES: Record<PackageId, Feature[]> = {
  essential: [],
  professional: ["cms"],
  premium: ["cms"],
};

/** Design level already covered by a package's base price. */
const INCLUDED_DESIGN: Record<PackageId, DesignLevel> = {
  essential: "refined",
  professional: "refined",
  premium: "distinctive",
};

/* ------------------------------------------------------------------ */
/* Answers & estimate                                                  */
/* ------------------------------------------------------------------ */

export type Answers = {
  projectType: ProjectType;
  pageBand: PageBand;
  copy: CopyOption;
  imagery: ImageryOption;
  features: Feature[];
  branding: BrandingOption;
  designLevel: DesignLevel;
  carePlan: CarePlan;
  timing: TimingOption;
};

export const DEFAULT_ANSWERS: Answers = {
  projectType: "business",
  pageBand: "1-5",
  copy: "provided",
  imagery: "provided",
  features: [],
  branding: "established",
  designLevel: "refined",
  carePlan: "care",
  timing: "flexible",
};

export type LineItem = { label: string; amount: number };

export type Estimate = {
  packageId: PackageId;
  lineItems: LineItem[];
  /** Calculated one-off build figure, before the indicative range is applied. */
  build: number;
  range: { low: number; high: number };
  monthly: number;
  /** True when a binding price needs a scope-confirmation call first. */
  requiresScope: boolean;
  scopeReasons: string[];
  /** True when the brief maps cleanly onto a fixed-scope package. */
  fixedScope: boolean;
  assumptions: string[];
  exclusions: string[];
};

const roundTo = (n: number, step: number) => Math.round(n / step) * step;

/** Features implied by the project type, merged with the visitor's choices. */
export function effectiveFeatures(answers: Pick<Answers, "projectType" | "features">): Feature[] {
  const set = new Set<Feature>(answers.features);
  if (answers.projectType === "shop") {
    set.add("ecommerce");
    set.add("payments");
  }
  if (answers.projectType === "booking") set.add("booking");
  return (Object.keys(FEATURES) as Feature[]).filter((f) => set.has(f));
}

export function recommendPackage(answers: Pick<Answers, "pageBand" | "designLevel">): PackageId {
  if (answers.pageBand === "13-25" || answers.pageBand === "26+" || answers.designLevel === "signature") {
    return "premium";
  }
  if (answers.pageBand === "6-12") return "professional";
  return "essential";
}

export function estimate(answers: Answers): Estimate {
  const packageId = recommendPackage(answers);
  const pkg = PACKAGES[packageId];
  const features = effectiveFeatures(answers);
  const lineItems: LineItem[] = [{ label: `${pkg.name} package`, amount: pkg.from }];
  const scopeReasons: string[] = [];

  // Content
  const copyBand = answers.pageBand === "26+" ? "13-25" : answers.pageBand;
  if (answers.copy !== "provided") {
    lineItems.push({
      label: answers.copy === "editing" ? "Copy editing" : "Copywriting",
      amount: RATES.copy[answers.copy][copyBand],
    });
  }
  if (answers.imagery === "sourced") {
    lineItems.push({ label: "Licensed imagery sourcing", amount: RATES.imagerySourcing });
  }

  // Functionality
  for (const f of features) {
    if (INCLUDED_FEATURES[packageId].includes(f)) continue;
    const amount = RATES.features[f];
    if (amount > 0) lineItems.push({ label: FEATURES[f].label, amount });
  }

  // Design
  if (answers.branding !== "established") {
    lineItems.push({
      label: answers.branding === "partial" ? "Web palette from existing logo" : "Simple visual identity",
      amount: RATES.branding[answers.branding],
    });
  }
  const designDelta = RATES.design[answers.designLevel] - RATES.design[INCLUDED_DESIGN[packageId]];
  if (designDelta > 0) {
    lineItems.push({ label: `${DESIGN_LEVELS[answers.designLevel].label} design level`, amount: designDelta });
  }

  const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
  if (answers.timing === "soon") {
    lineItems.push({ label: "Shorter timeline", amount: roundTo(subtotal * RATES.soonPremium, 50) });
  }

  const build = lineItems.reduce((sum, item) => sum + item.amount, 0);

  // Scope confirmation rules (README §11: no binding payment for ambiguous work)
  if (answers.projectType === "webapp") scopeReasons.push("Bespoke web applications are always scoped individually.");
  if (answers.projectType === "unsure") scopeReasons.push("We'll recommend the right approach on a short call.");
  if (answers.pageBand === "26+") scopeReasons.push("Sites over 25 pages are scoped individually.");
  if (features.includes("custom")) scopeReasons.push("Custom features are priced once we understand them.");
  if (features.includes("accounts")) scopeReasons.push("Customer accounts depend on your data and security needs.");
  if (features.includes("integrations")) scopeReasons.push("Integrations depend on the services involved.");
  if (answers.timing === "soon" || answers.timing === "date") {
    scopeReasons.push("Delivery dates are confirmed against availability before work is booked.");
  }

  const requiresScope = scopeReasons.length > 0;
  const exclusions = [
    "Domain registration and renewal",
    "Business email",
    "Paid plugins, fonts or software licences",
    "Third-party subscriptions and usage-based charges (for example payment fees)",
    "Major new features after launch",
  ];
  const assumptions = [
    `Up to ${pkg.pageLimit} pages unless otherwise agreed.`,
    "Revision rounds as listed in the package.",
    "Content is supplied before the build stage begins, unless copywriting is included.",
    "Delivery dates are agreed after scope confirmation, not guaranteed by this estimate.",
  ];

  return {
    packageId,
    lineItems,
    build,
    range: { low: build, high: roundTo(build * (1 + RATES.rangeSpread), 50) },
    monthly: CARE_PLANS[answers.carePlan].monthly,
    requiresScope,
    scopeReasons,
    fixedScope: !requiresScope,
    assumptions,
    exclusions,
  };
}

const gbp = new Intl.NumberFormat("en-GB", { style: "currency", currency: CURRENCY, maximumFractionDigits: 0 });
export const formatGBP = (n: number) => gbp.format(n);

/* ------------------------------------------------------------------ */
/* Validation of untrusted answers (used by the API route)            */
/* ------------------------------------------------------------------ */

function pick<T extends Record<string, unknown>>(options: T, value: unknown): keyof T | null {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(options, value) ? (value as keyof T) : null;
}

/** Returns validated answers, or null if anything is missing or unknown. */
export function parseAnswers(input: unknown): Answers | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Record<string, unknown>;
  const projectType = pick(PROJECT_TYPES, raw.projectType);
  const pageBand = pick(PAGE_BANDS, raw.pageBand);
  const copy = pick(COPY_OPTIONS, raw.copy);
  const imagery = pick(IMAGERY_OPTIONS, raw.imagery);
  const branding = pick(BRANDING_OPTIONS, raw.branding);
  const designLevel = pick(DESIGN_LEVELS, raw.designLevel);
  const carePlan = pick(CARE_PLANS, raw.carePlan);
  const timing = pick(TIMING_OPTIONS, raw.timing);
  if (!Array.isArray(raw.features) || raw.features.length > Object.keys(FEATURES).length) return null;
  const features = raw.features.map((f) => pick(FEATURES, f));
  if (features.some((f) => f === null)) return null;
  if (!projectType || !pageBand || !copy || !imagery || !branding || !designLevel || !carePlan || !timing) {
    return null;
  }
  return {
    projectType,
    pageBand,
    copy,
    imagery,
    features: [...new Set(features as Feature[])],
    branding,
    designLevel,
    carePlan,
    timing,
  };
}
