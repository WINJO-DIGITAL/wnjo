/**
 * The website price calculator: one pure module used by the browser (live estimate) and the server (the trusted
 * recalculation on submit), so the two can never disagree. Every figure comes from lib/pricing.
 *
 * Rules:
 * - A feature already included in the chosen package is shown as included and never charged.
 * - Pages are priced at the top of the chosen band, and only beyond the package's allowance.
 * - On a monthly package, an add-on with only a one-off price is added to the first payment.
 * - On a one-off website, an add-on with only a monthly price becomes an optional recurring cost.
 * - Anything priced by the amount of work is marked as needing a custom quote rather than given a figure.
 * - Hosting and care are never added to a monthly package: the package already includes them.
 * - A monthly package is rolling monthly. Where a minimum term is configured (OWNERSHIP), its total is also shown.
 */
import {
  ADD_ONS,
  CARE_PLANS,
  EXTRA_PAGE,
  ONE_OFF_TIERS,
  ONE_OFF_WEBSITE,
  OWNERSHIP,
  WEBSITE_PAGE_BANDS,
  WEBSITE_PLANS,
  tierForPages,
  type AddOnId,
  type CarePlan,
  type WebsitePageBand,
  type WebsitePlanId,
} from "./pricing";

export const WANTS = {
  monthly: { label: "Managed website", hint: "We design, host, maintain and update your website for one monthly payment." },
  oneOff: { label: "One-off website project", hint: "Own your website: pay once, and it is yours on full payment." },
  booking: { label: "Booking system", hint: "Bookings, payments and an operator app for your business." },
  software: { label: "Custom application or software", hint: "Portals, platforms, internal tools and integrations." },
  unsure: { label: "Not sure yet", hint: "We'll help you choose. Start with a website and change it any time." },
} as const;
export type Want = keyof typeof WANTS;

/** The calculator only prices websites; these two go to their own enquiry. */
export const ROUTED_WANTS: Partial<Record<Want, { href: string; service: string }>> = {
  booking: { href: "/contact?topic=booking-software", service: "Simplify" },
  software: { href: "/contact?topic=bespoke", service: "Build" },
};

export const YES_NO = { yes: { label: "Yes" }, no: { label: "No" } } as const;
export type YesNo = keyof typeof YES_NO;

export const COPY_STATES = {
  ready: { label: "Yes, it's ready" },
  drafts: { label: "Some, in draft" },
  none: { label: "Not yet" },
} as const;
export type CopyState = keyof typeof COPY_STATES;

export type ContentAnswers = {
  logo: YesNo;
  colours: YesNo;
  photos: YesNo;
  copy: CopyState;
  existingSite: YesNo;
  needCopywriting: YesNo;
  needBranding: YesNo;
};

export type WebsiteAnswers = {
  want: Want;
  plan: WebsitePlanId;
  /** Monthly or one-off, once a website is chosen ("unsure" prices as monthly). */
  mode: "monthly" | "oneOff";
  pages: WebsitePageBand;
  addOns: AddOnId[];
  content: ContentAnswers;
  /** One-off websites only: optional hosting and care after launch. */
  care: CarePlan;
};

export const DEFAULT_WEBSITE_ANSWERS: WebsiteAnswers = {
  want: "monthly",
  plan: "bronze",
  mode: "monthly",
  pages: "4-5",
  addOns: [],
  content: {
    logo: "yes",
    colours: "yes",
    photos: "yes",
    copy: "ready",
    existingSite: "no",
    needCopywriting: "no",
    needBranding: "no",
  },
  care: "hosting",
};

export type QuoteLine = {
  label: string;
  /** Charged every month (monthly package) or optional every month (one-off website). */
  monthly?: number;
  /** Charged once: in the first payment (monthly package) or in the project price (one-off website). */
  oneOff?: number;
  status?: "included" | "from" | "quote";
  note?: string;
};

export type WebsiteQuote = {
  mode: "monthly" | "oneOff";
  packageName: string;
  pagesIncluded: number;
  /** Top of the chosen page band, or null when it needs a custom quote. */
  pagesRequested: number | null;
  extraPages: number;
  lines: QuoteLine[];
  /** Monthly package: setup fee. One-off website: 0. */
  setup: number;
  /** Monthly package: the subscription each month. One-off: optional recurring (hosting, care, monthly add-ons). */
  monthly: number;
  /** One-off charges: monthly package extras added to the first payment, or the one-off project price. */
  oneOffTotal: number;
  /** What is paid first: setup + first month + one-off extras, or the project price. */
  initialPayment: number;
  /** Monthly package with a minimum term: setup plus the term's payments plus one-off extras. Null when rolling monthly. */
  minimumTermTotal: number | null;
  /** Some figures are starting prices ("from"). */
  hasFromPrices: boolean;
  requiresQuote: boolean;
  quoteReasons: string[];
  thirdParty: string[];
  notes: string[];
};

const ADD_ON_ORDER = Object.keys(ADD_ONS) as AddOnId[];

/**
 * The page band that matches a monthly package's included pages (Core 4 to 5, Plus 6 to 10, Pro 16 to 20). A new
 * calculator starts on this band, so a package never shows pages it doesn't include.
 */
export function bandForPlan(plan: WebsitePlanId): WebsitePageBand {
  const included = WEBSITE_PLANS[plan].pages;
  const band = (Object.keys(WEBSITE_PAGE_BANDS) as WebsitePageBand[]).find((b) => WEBSITE_PAGE_BANDS[b].max === included);
  return band ?? "6-10";
}

export function websiteQuote(answers: WebsiteAnswers): WebsiteQuote {
  const monthlyMode = answers.mode === "monthly";
  const plan = WEBSITE_PLANS[answers.plan];
  const included = new Set<AddOnId>(monthlyMode ? plan.includedAddOns : ONE_OFF_WEBSITE.includedAddOns);
  // A one-off website is priced from the tier that fits the pages asked for, so the price matches the tier on the site.
  const tier = ONE_OFF_TIERS[tierForPages(answers.pages)];
  const pagesIncluded = monthlyMode ? plan.pages : tier.pageLimit;
  const band = WEBSITE_PAGE_BANDS[answers.pages];
  const pagesRequested = band.max;
  const extraPages = pagesRequested === null ? 0 : Math.max(0, pagesRequested - pagesIncluded);

  const lines: QuoteLine[] = [];
  const quoteReasons: string[] = [];
  const thirdParty: string[] = [];
  const notes: string[] = [];
  let hasFromPrices = false;

  lines.push(
    monthlyMode
      ? { label: `${plan.name} plan`, monthly: plan.monthly }
      : { label: `${tier.name} website`, oneOff: tier.from, status: "from" },
  );
  if (!monthlyMode) hasFromPrices = true;

  if (pagesRequested === null) {
    quoteReasons.push("Sites with more than 20 pages are quoted individually.");
    lines.push({ label: "Pages beyond 20", status: "quote" });
  } else if (extraPages > 0) {
    const label = `${extraPages} extra page${extraPages === 1 ? "" : "s"} (${pagesIncluded} included)`;
    lines.push(
      monthlyMode
        ? { label, monthly: extraPages * EXTRA_PAGE.monthly }
        : { label, oneOff: extraPages * EXTRA_PAGE.oneOff },
    );
  }

  const chosen = ADD_ON_ORDER.filter((id) => answers.addOns.includes(id));
  // A package's included features are always listed, so customers can see what they already have.
  const listed = ADD_ON_ORDER.filter((id) => included.has(id) || chosen.includes(id));
  for (const id of listed) {
    const addOn: (typeof ADD_ONS)[AddOnId] = ADD_ONS[id];
    if (included.has(id)) {
      lines.push({ label: addOn.label, status: "included" });
      continue;
    }
    if ("thirdParty" in addOn && addOn.thirdParty) thirdParty.push(addOn.thirdParty);
    const isFrom = "from" in addOn && addOn.from === true;
    if (monthlyMode) {
      if (addOn.monthly !== null) {
        lines.push({ label: addOn.label, monthly: addOn.monthly, ...(isFrom && { status: "from" as const }) });
      } else if ("monthlyQuoted" in addOn && addOn.monthlyQuoted) {
        lines.push({ label: addOn.label, status: "quote" });
        quoteReasons.push(`${addOn.label} on a monthly package is quoted to fit your shop.`);
        continue;
      } else if (addOn.oneOff !== null) {
        lines.push({ label: addOn.label, oneOff: addOn.oneOff, ...(isFrom && { status: "from" as const }) });
      }
    } else if (addOn.oneOff !== null) {
      lines.push({ label: addOn.label, oneOff: addOn.oneOff, ...(isFrom && { status: "from" as const }) });
    } else if (addOn.monthly !== null) {
      lines.push({ label: addOn.label, monthly: addOn.monthly, ...(isFrom && { status: "from" as const }) });
    }
    if (isFrom) hasFromPrices = true;
  }

  // Hosting and care: optional on a one-off website, already included in a monthly package.
  if (!monthlyMode && answers.care !== "none") {
    lines.push({ label: `${CARE_PLANS[answers.care].label} (optional)`, monthly: CARE_PLANS[answers.care].monthly });
  }

  const content = answers.content;
  if (content.needCopywriting === "yes") {
    quoteReasons.push("Copywriting is quoted once we know how many pages need writing.");
    lines.push({ label: "Copywriting", status: "quote" });
  }
  if (content.needBranding === "yes") {
    quoteReasons.push("Branding help is quoted after a short conversation about what you need.");
    lines.push({ label: "Branding assistance", status: "quote" });
  }
  if (content.photos === "no") notes.push("No photography yet: we can recommend a photographer or source licensed images, quoted separately.");
  if (content.logo === "no" && content.needBranding === "no") notes.push("No logo yet: we can design one as part of branding help.");

  const monthly = lines.reduce((sum, l) => sum + (l.monthly ?? 0), 0);
  const oneOffTotal = lines.reduce((sum, l) => sum + (l.oneOff ?? 0), 0);
  const setup = monthlyMode ? plan.setup : 0;
  const initialPayment = monthlyMode ? setup + monthly + oneOffTotal : oneOffTotal;
  const minimumTermTotal =
    monthlyMode && OWNERSHIP.minimumTermMonths > 0 ? setup + monthly * OWNERSHIP.minimumTermMonths + oneOffTotal : null;

  return {
    mode: answers.mode,
    packageName: monthlyMode ? plan.name : `${tier.name} website`,
    pagesIncluded,
    pagesRequested,
    extraPages,
    lines,
    setup,
    monthly,
    oneOffTotal,
    initialPayment,
    minimumTermTotal,
    hasFromPrices,
    requiresQuote: quoteReasons.length > 0,
    quoteReasons,
    thirdParty: [...new Set(thirdParty)],
    notes,
  };
}

/* ------------------------------------------------------------------ */
/* Validation of untrusted answers (the server never trusts the browser) */
/* ------------------------------------------------------------------ */

const has = <T extends object>(options: T, value: unknown): value is keyof T =>
  typeof value === "string" && Object.prototype.hasOwnProperty.call(options, value);

export function parseWebsiteAnswers(input: unknown): WebsiteAnswers | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Record<string, unknown>;
  const c = (raw.content ?? {}) as Record<string, unknown>;
  if (!has(WANTS, raw.want) || !has(WEBSITE_PLANS, raw.plan) || !has(WEBSITE_PAGE_BANDS, raw.pages)) return null;
  if (raw.mode !== "monthly" && raw.mode !== "oneOff") return null;
  if (!has(CARE_PLANS, raw.care)) return null;
  if (!Array.isArray(raw.addOns) || raw.addOns.length > ADD_ON_ORDER.length) return null;
  const addOns = [...new Set(raw.addOns)];
  if (!addOns.every((a) => has(ADD_ONS, a))) return null;
  const yn = (v: unknown) => (has(YES_NO, v) ? v : null);
  const content = {
    logo: yn(c.logo),
    colours: yn(c.colours),
    photos: yn(c.photos),
    copy: has(COPY_STATES, c.copy) ? c.copy : null,
    existingSite: yn(c.existingSite),
    needCopywriting: yn(c.needCopywriting),
    needBranding: yn(c.needBranding),
  };
  if (Object.values(content).some((v) => v === null)) return null;
  return {
    want: raw.want,
    plan: raw.plan,
    mode: raw.mode,
    pages: raw.pages,
    addOns: addOns as AddOnId[],
    content: content as ContentAnswers,
    care: raw.care,
  };
}

/** Plain-text summary for emails and the stored enquiry. */
export function formatWebsiteQuote(answers: WebsiteAnswers, quote: WebsiteQuote, gbp: (n: number) => string): string {
  const money = (l: QuoteLine) => {
    if (l.status === "included") return "Included";
    if (l.status === "quote") return "Custom quote";
    const from = l.status === "from" ? "from " : "";
    if (l.monthly !== undefined) return `${from}${gbp(l.monthly)} a month${quote.mode === "oneOff" ? " (optional)" : ""}`;
    if (l.oneOff !== undefined) return `${from}${gbp(l.oneOff)}${quote.mode === "monthly" ? " (in first payment)" : ""}`;
    return "";
  };
  const c = answers.content;
  const out = [
    "WEBSITE QUOTE",
    `What they want: ${WANTS[answers.want].label}`,
    `Package: ${quote.packageName}${quote.mode === "monthly" ? " (monthly)" : " (one-off)"}`,
    `Pages: ${WEBSITE_PAGE_BANDS[answers.pages].label}`,
    "",
    ...quote.lines.map((l) => `- ${l.label}: ${money(l)}`),
    "",
  ];
  if (quote.mode === "monthly") {
    out.push(
      ...(quote.setup > 0 ? [`Setup fee: ${gbp(quote.setup)}`] : []),
      `First payment: ${gbp(quote.initialPayment)}`,
      `Monthly subscription: ${gbp(quote.monthly)}`,
      quote.minimumTermTotal !== null
        ? `Minimum term (${OWNERSHIP.minimumTermMonths} months) total: ${gbp(quote.minimumTermTotal)}`
        : "Term: rolling monthly, no minimum term",
    );
  } else {
    out.push(
      `Total project price: ${quote.hasFromPrices ? "from " : ""}${gbp(quote.oneOffTotal)}`,
      `Optional ongoing: ${quote.monthly ? `${gbp(quote.monthly)} a month` : "None chosen"}`,
    );
  }
  if (quote.quoteReasons.length) out.push("", "Needs a custom quote:", ...quote.quoteReasons.map((r) => `- ${r}`));
  if (quote.thirdParty.length) out.push("", "Third-party fees:", ...quote.thirdParty.map((r) => `- ${r}`));
  out.push(
    "",
    "CONTENT",
    `Logo: ${YES_NO[c.logo].label} · Brand colours: ${YES_NO[c.colours].label} · Photography: ${YES_NO[c.photos].label}`,
    `Website copy: ${COPY_STATES[c.copy].label} · Existing website: ${YES_NO[c.existingSite].label}`,
    `Wants copywriting: ${YES_NO[c.needCopywriting].label} · Wants branding help: ${YES_NO[c.needBranding].label}`,
  );
  return out.join("\n");
}
