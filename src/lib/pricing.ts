/**
 * The single, authoritative source of WINJO DIGITAL pricing rules (README §7, §8, §13).
 *
 * Both the browser (live estimate) and the server (enquiry validation) import this
 * module, so a price is never calculated in two places. Browser-side results are
 * informational; the API route recalculates from the submitted answers.
 *
 * STATUS: CONFIRMED by the owner on 8 November 2026 (package, care, subscription,
 * scoped and day-rate figures set from UK market ranges). `PRICING_STATUS` drives the
 * notice shown wherever prices appear. The same package and care prices live in the
 * Supabase pricing catalogue, which quotes are built from: change both together.
 */

export const PRICING_STATUS: "provisional" | "confirmed" = "confirmed";
export const CURRENCY = "GBP";
export const VAT_NOTE = "WINJO DIGITAL is not VAT registered, so no VAT is added to our prices.";

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
    monthly: 49,
    summary: "Managed hosting and technical upkeep for a site you own.",
    includes: [
      "Managed hosting",
      "SSL certificate",
      "Uptime monitoring",
      "Security updates",
      "Technical support",
    ],
  },
  care: {
    label: "Care",
    monthly: 95,
    summary: "Hosting plus routine updates and small changes each month.",
    includes: [
      "Everything in Hosting",
      "Routine updates",
      "Up to 1 hour of small content changes per month",
      "Email support",
    ],
  },
  carePlus: {
    label: "Care Plus",
    monthly: 220,
    summary: "For sites that change often or carry more functionality.",
    includes: [
      "Everything in Care",
      "Up to 3 hours of changes or improvements per month",
      "Quarterly performance and accessibility review",
      "Priority email support",
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
    from: 2400,
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
    from: 4500,
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
    from: 8500,
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
/* Services priced outside the website calculator (owner-approved,      */
/* 8 November 2026, from UK market ranges)                              */
/* ------------------------------------------------------------------ */

/** Starting prices for bespoke work that is always scoped individually. */
export const SCOPED_FROM = {
  /** Simplify: a bespoke booking system with payments and an operator app. */
  bookingSystem: 6000,
  /** Build: custom apps, portals and software. */
  software: 12000,
} as const;

/** Day rate for extra work and changes outside a plan's allowance. */
export const DAY_RATE = 450;

/**
 * Monthly subscriptions for scoped work (Simplify and Build). Website subscriptions are the Core, Pro and
 * Plus packages below. Setup and term are confirmed in the written proposal.
 */
export const SUBSCRIPTIONS = {
  simplify: {
    name: "Simplify",
    setup: 995,
    monthly: 395,
    summary: "A booking system for your business.",
    includes: ["Bookings with payments", "Operator app", "Hosting, support and improvements"],
  },
  build: {
    name: "Build",
    setup: null,
    monthly: 750,
    summary: "A custom app or platform.",
    includes: ["Scoped to your business", "Hosting and support", "An agreed block of development each month"],
  },
} as const;
export type SubscriptionId = keyof typeof SUBSCRIPTIONS;

/* ------------------------------------------------------------------ */
/* Website packages (Grow): monthly subscriptions and the one-off site  */
/* Set by the owner on 8 November 2026. Every price, allowance and      */
/* inclusion below is configurable; nothing else hardcodes them.        */
/* ------------------------------------------------------------------ */

/**
 * Term rules for managed website subscriptions, set by the owner's repositioning brief (10 November 2026):
 * rolling monthly, no minimum term, and no transfer of ownership of our code. Both figures are stored on every
 * subscription when it is offered, so customers who joined under the earlier 12-month terms keep exactly what they
 * agreed. 0 means "does not apply" (no minimum term; ownership of the build does not transfer).
 *
 * LEGAL_REVIEW_PENDING keeps a visible "draft" notice on the terms and wherever the subscription rules are shown.
 * The cancellation, notice and transfer details of the new model are NOT yet agreed: keep this true until the owner
 * confirms them and the terms have been reviewed.
 */
export const OWNERSHIP = {
  minimumTermMonths: 0,
  ownershipAfterPayments: 0,
} as const;
export const LEGAL_REVIEW_PENDING = false;

/**
 * Subscription rules the customer relies on (decided 10 November 2026, to match common UK managed-service practice).
 * The terms page and the subscription summaries read these figures, so they are stated in one place.
 */
export const SUBSCRIPTION_TERMS = {
  /** Days' written notice to end a subscription. No cancellation fee. */
  noticeDays: 30,
  /** Days' notice of any change to a monthly price. */
  priceChangeNoticeDays: 30,
  /** Days within which we hand over content and design files after a request. */
  handoverDays: 14,
  /** Days a site stays live, free of charge, after the end date, so a move can happen without downtime. */
  liveAfterEndDays: 30,
  /** Days within which we reply to a support message, by plan. */
  replyWorkingDays: { bronze: 2, silver: 1, gold: 1 },
  /** Days within which a customer complaint gets a first written reply. */
  complaintReplyWorkingDays: 5,
  /** Monthly time allowed for small changes, in minutes, by plan. Unused time does not carry over. */
  changeMinutes: { bronze: 30, silver: 60, gold: 180 },
} as const;

/** Winjo Refresh: a planned design and experience refresh, included in the packages listed. */
export const REFRESH = {
  everyMonths: 24,
  plans: ["silver", "gold"] as string[],
} as const;

/** Add-ons a website can carry. A null price means that payment mode doesn't apply to the add-on. */
export const ADD_ONS = {
  booking: { label: "Online booking", monthly: 15, oneOff: 199, thirdParty: "Booking provider fees, if any, are paid to the provider." },
  calendar: { label: "Appointment calendar", monthly: 10, oneOff: 99 },
  blog: { label: "Blog", monthly: 10, oneOff: 99 },
  gallery: { label: "Image gallery", monthly: 5, oneOff: 49 },
  testimonials: { label: "Testimonials section", monthly: 5, oneOff: 49 },
  advancedForms: { label: "Advanced enquiry forms", monthly: 10, oneOff: 99 },
  whatsapp: { label: "WhatsApp integration", monthly: 5, oneOff: 49 },
  liveChat: { label: "Live chat", monthly: 10, oneOff: 99, thirdParty: "Live chat software fees, if any, are paid to the provider." },
  ecommerce: { label: "Online shop (e-commerce)", monthly: null, oneOff: 499, from: true, monthlyQuoted: true, thirdParty: "Payment processing fees are charged by the payment provider." },
  aiAssistant: { label: "AI enquiry assistant", monthly: 29, oneOff: null },
  leadNotifications: { label: "Automated lead notifications", monthly: 10, oneOff: null },
  localSeo: { label: "Local SEO setup", monthly: null, oneOff: 199 },
  seoManagement: { label: "Ongoing SEO management", monthly: 99, oneOff: null, from: true },
} as const satisfies Record<
  string,
  { label: string; monthly: number | null; oneOff: number | null; from?: boolean; monthlyQuoted?: boolean; thirdParty?: string }
>;
export type AddOnId = keyof typeof ADD_ONS;

/** Extra pages beyond a package's allowance. */
export const EXTRA_PAGE = { monthly: 10, oneOff: 75 } as const;

/** Page bands offered in the calculator. Pricing uses the top of the band; above maxQuotedPages needs a quote. */
export const WEBSITE_PAGE_BANDS = {
  "4-5": { label: "Up to 5 pages", max: 5 },
  "6-10": { label: "6 to 10 pages", max: 10 },
  "11-15": { label: "11 to 15 pages", max: 15 },
  "16-20": { label: "16 to 20 pages", max: 20 },
  "20+": { label: "More than 20 pages", max: null },
} as const;
export type WebsitePageBand = keyof typeof WEBSITE_PAGE_BANDS;

/**
 * The three managed website subscriptions: Core, Pro and Plus. The ids (bronze, silver, gold) are the codes stored
 * with every subscription and must not change; only the names and contents do. Prices and inclusions are the
 * standard ones from the owner's brief of 10 November 2026. `setup` is 0: the brief describes one monthly payment
 * with no large upfront cost (OWNER TO CONFIRM that no setup fee applies). `includedAddOns` are shown as included
 * and never charged. Exact service limits ("small agreed changes", response times, what a refresh covers) are still
 * being finalised and are deliberately not defined here.
 */
export const WEBSITE_PLANS = {
  bronze: {
    name: "Core",
    monthly: 99,
    setup: 0,
    pages: 5,
    popular: false,
    tagline: "Essential managed website service.",
    summary: "A professionally designed website with all the essential technical management taken care of.",
    bestFor: "For businesses that need a professional website and want the technical side handled.",
    contentHours: 0,
    changes: "Up to 30 minutes a month",
    support: "Technical support",
    seo: "Basic SEO foundations",
    refresh: false,
    includes: [
      "Bespoke website design",
      "Up to 5 pages",
      "Managed hosting",
      "SSL certificate",
      "Security monitoring",
      "Technical maintenance and updates",
      "Uptime monitoring and fault resolution",
      "Contact forms",
      "Mobile optimisation",
      "Basic SEO foundations",
      "Technical support",
      "Up to 30 minutes of small website changes a month",
    ],
    includedAddOns: [] as AddOnId[],
  },
  silver: {
    name: "Pro",
    monthly: 149,
    setup: 0,
    pages: 10,
    popular: true,
    tagline: "A website that\u2019s actively maintained and improved.",
    summary: "Everything in Core, with search foundations, a monthly snapshot of how the site is doing, and a refresh every 24 months.",
    bestFor: "For businesses that rely on their website for enquiries and want it kept moving.",
    contentHours: 1,
    changes: "1 hour of content changes a month",
    support: "Priority support",
    seo: "Enhanced and local SEO foundations",
    refresh: true,
    includes: [
      "Everything in Core",
      "Bespoke website up to 10 pages",
      "Enhanced SEO foundations",
      "Local SEO foundations",
      "Google Analytics integration",
      "Google Search Console integration",
      "AEO foundations for AI-powered search",
      "Monthly website performance snapshot",
      "One hour of monthly content changes",
      "Priority support",
      "Winjo Refresh every 24 months",
    ],
    includedAddOns: ["localSeo"] as AddOnId[],
  },
  gold: {
    name: "Plus",
    monthly: 199,
    setup: 0,
    pages: 20,
    popular: false,
    tagline: "A more complete digital partnership.",
    summary: "Everything in Pro, with advanced search and technical work, quarterly reviews and more time for changes each month.",
    bestFor: "For growing businesses with a larger site and more going on each month.",
    contentHours: 3,
    changes: "3 hours of content and agreed development changes a month",
    support: "Enhanced priority support",
    seo: "Advanced SEO",
    refresh: true,
    includes: [
      "Everything in Pro",
      "Bespoke website up to 20 pages",
      "Advanced SEO",
      "Advanced technical optimisation",
      "Expanded AEO and GEO strategy",
      "AI search visibility monitoring where available",
      "Agentic-readiness foundations",
      "Quarterly performance reviews",
      "Three hours of monthly content and agreed development changes",
      "Enhanced priority support",
      "Winjo Refresh every 24 months",
    ],
    includedAddOns: ["localSeo"] as AddOnId[],
  },
} as const;
export type WebsitePlanId = keyof typeof WEBSITE_PLANS;

/** The one-off bespoke website, paid up front. Hosting and care are separate and optional. */
export const ONE_OFF_WEBSITE = {
  name: "Bespoke website",
  from: 999,
  pages: 5,
  summary: "For businesses that would rather buy their website outright and own it on full payment.",
  includes: [
    "Up to 5 pages",
    "Bespoke design",
    "Custom development",
    "Mobile responsive",
    "Contact forms",
    "SEO foundations",
    "Analytics setup",
    "Launch support",
    "Website ownership following full payment",
  ],
  includedAddOns: [] as AddOnId[],
} as const;

/* ------------------------------------------------------------------ */
/* Rates                                                               */
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

/**
 * An amount in pence, shown exactly: whole pounds without decimals, anything else with pence. Used wherever the
 * amount a customer is about to be charged is shown, so a £499.50 deposit never reads as "£500".
 */
const gbpExact = new Intl.NumberFormat("en-GB", { style: "currency", currency: CURRENCY, minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const formatPence = (pence: number) => (pence % 100 === 0 ? gbp.format(pence / 100) : gbpExact.format(pence / 100));

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
