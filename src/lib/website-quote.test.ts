import { describe, expect, it } from "vitest";
import { ADD_ONS, CARE_PLANS, EXTRA_PAGE, ONE_OFF_WEBSITE, OWNERSHIP, WEBSITE_PLANS, formatGBP } from "./pricing";
import {
  DEFAULT_WEBSITE_ANSWERS,
  bandForPlan,
  formatWebsiteQuote,
  parseWebsiteAnswers,
  websiteQuote,
  type WebsiteAnswers,
} from "./website-quote";

const answers = (over: Partial<WebsiteAnswers> = {}): WebsiteAnswers => ({ ...DEFAULT_WEBSITE_ANSWERS, ...over });
const monthly = (plan: WebsiteAnswers["plan"], over: Partial<WebsiteAnswers> = {}) =>
  answers({ want: "monthly", mode: "monthly", plan, pages: "1-3", ...over });
// The managed subscriptions: Core (bronze) £99 for 5 pages, Pro (silver) £149 for 10, Plus (gold) £199 for 20.
const oneOff = (over: Partial<WebsiteAnswers> = {}) => answers({ want: "oneOff", mode: "oneOff", pages: "4-5", care: "none", ...over });

describe("monthly packages", () => {
  it("prices Core at £99 a month, with the first month as the only first payment", () => {
    const q = websiteQuote(monthly("bronze"));
    expect(WEBSITE_PLANS.bronze.name).toBe("Core");
    expect(q.monthly).toBe(99);
    expect(q.setup).toBe(0);
    expect(q.initialPayment).toBe(99);
  });

  it("prices Pro at £149 a month for up to 10 pages", () => {
    const q = websiteQuote(monthly("silver", { pages: "6-10" }));
    expect(WEBSITE_PLANS.silver.name).toBe("Pro");
    expect(q.monthly).toBe(149);
    expect(q.extraPages).toBe(0);
    expect(q.initialPayment).toBe(149);
  });

  it("prices Plus at £199 a month for up to 20 pages", () => {
    const q = websiteQuote(monthly("gold", { pages: "16-20" }));
    expect(WEBSITE_PLANS.gold.name).toBe("Plus");
    expect(q.monthly).toBe(199);
    expect(q.extraPages).toBe(0);
    expect(q.initialPayment).toBe(199);
  });

  it("highlights Pro and only Pro", () => {
    expect(Object.entries(WEBSITE_PLANS).filter(([, p]) => p.popular).map(([id]) => id)).toEqual(["silver"]);
  });

  it("includes Winjo Refresh in Pro and Plus, and not in Core", () => {
    expect(Object.entries(WEBSITE_PLANS).filter(([, p]) => p.refresh).map(([id]) => id)).toEqual(["silver", "gold"]);
  });

  it("never adds hosting or care to a monthly package, which already includes them", () => {
    const q = websiteQuote(monthly("silver", { care: "carePlus" }));
    expect(q.lines.some((l) => /Hosting|Care/.test(l.label))).toBe(false);
    expect(q.monthly).toBe(149);
  });

  it("is rolling monthly: no minimum term, so no minimum-term total", () => {
    expect(OWNERSHIP.minimumTermMonths).toBe(0);
    expect(OWNERSHIP.ownershipAfterPayments).toBe(0);
    expect(websiteQuote(monthly("gold", { pages: "6-10" })).minimumTermTotal).toBeNull();
  });
});

describe("pages", () => {
  it("does not charge for pages a package already includes", () => {
    expect(websiteQuote(monthly("bronze", { pages: "1-3" })).extraPages).toBe(0);
    expect(websiteQuote(monthly("bronze", { pages: "4-5" })).extraPages).toBe(0);
    expect(websiteQuote(monthly("silver", { pages: "6-10" })).extraPages).toBe(0);
    expect(websiteQuote(monthly("gold", { pages: "16-20" })).extraPages).toBe(0);
    expect(websiteQuote(oneOff({ pages: "4-5" })).extraPages).toBe(0);
  });

  it("charges £10 a month per page beyond a monthly package's allowance, at the top of the band", () => {
    const q = websiteQuote(monthly("bronze", { pages: "6-10" }));
    expect(q.extraPages).toBe(5);
    expect(q.monthly).toBe(99 + 5 * EXTRA_PAGE.monthly);
    const silver = websiteQuote(monthly("silver", { pages: "11-15" }));
    expect(silver.extraPages).toBe(5);
    expect(silver.monthly).toBe(149 + 50);
  });

  it("charges £75 per page beyond the one-off website's five", () => {
    const q = websiteQuote(oneOff({ pages: "6-10" }));
    expect(q.extraPages).toBe(5);
    expect(q.oneOffTotal).toBe(999 + 5 * EXTRA_PAGE.oneOff);
  });

  it("asks for a custom quote above 20 pages instead of pricing it", () => {
    const q = websiteQuote(monthly("gold", { pages: "20+" }));
    expect(q.requiresQuote).toBe(true);
    expect(q.pagesRequested).toBeNull();
    expect(q.monthly).toBe(199);
  });
});

describe("add-ons", () => {
  it("lists a package's included features as included and charges nothing for them", () => {
    const q = websiteQuote(monthly("silver", { addOns: ["localSeo"] }));
    expect(q.lines.find((l) => l.label === ADD_ONS.localSeo.label)?.status).toBe("included");
    expect(q.monthly).toBe(149);
    expect(q.oneOffTotal).toBe(0);
  });

  it("charges the monthly price for add-ons on a monthly package", () => {
    const q = websiteQuote(monthly("bronze", { addOns: ["booking", "blog", "aiAssistant"] }));
    expect(q.monthly).toBe(99 + 15 + 10 + 29);
  });

  it("does not charge Pro or Plus for local SEO, which both include", () => {
    for (const plan of ["silver", "gold"] as const) {
      const q = websiteQuote(monthly(plan, { addOns: ["localSeo", "liveChat"] }));
      expect(q.oneOffTotal).toBe(0);
      expect(q.monthly).toBe(WEBSITE_PLANS[plan].monthly + 10);
    }
  });

  it("adds one-off-only add-ons to the first payment of a monthly package", () => {
    const q = websiteQuote(monthly("bronze", { addOns: ["localSeo"] }));
    expect(q.monthly).toBe(99);
    expect(q.oneOffTotal).toBe(199);
    expect(q.initialPayment).toBe(99 + 199);
  });

  it("charges the one-off price for add-ons on a one-off website", () => {
    const q = websiteQuote(oneOff({ addOns: ["booking", "gallery", "localSeo"] }));
    expect(q.oneOffTotal).toBe(999 + 199 + 49 + 199);
    expect(q.monthly).toBe(0);
  });

  it("shows monthly-only add-ons as optional ongoing costs on a one-off website", () => {
    const q = websiteQuote(oneOff({ addOns: ["aiAssistant", "leadNotifications"] }));
    expect(q.oneOffTotal).toBe(999);
    expect(q.monthly).toBe(29 + 10);
  });

  it("treats e-commerce as from £499 on a one-off site and as a custom quote on a monthly package", () => {
    const one = websiteQuote(oneOff({ addOns: ["ecommerce"] }));
    expect(one.oneOffTotal).toBe(999 + 499);
    expect(one.hasFromPrices).toBe(true);
    const sub = websiteQuote(monthly("silver", { addOns: ["ecommerce"] }));
    expect(sub.requiresQuote).toBe(true);
    expect(sub.monthly).toBe(149);
  });

  it("lists third-party fees separately and only once", () => {
    const q = websiteQuote(oneOff({ addOns: ["booking", "liveChat", "ecommerce"] }));
    expect(q.thirdParty).toHaveLength(3);
  });
});

describe("one-off website", () => {
  it("starts from £999 for up to five pages", () => {
    const q = websiteQuote(oneOff());
    expect(q.oneOffTotal).toBe(ONE_OFF_WEBSITE.from);
    expect(q.initialPayment).toBe(999);
    expect(q.setup).toBe(0);
    expect(q.minimumTermTotal).toBeNull();
  });

  it("offers hosting at £49 a month, optional and separate from the project price", () => {
    const q = websiteQuote(oneOff({ care: "hosting" }));
    expect(CARE_PLANS.hosting.monthly).toBe(49);
    expect(q.monthly).toBe(49);
    expect(q.oneOffTotal).toBe(999);
  });

  it("prices Care and Care Plus at £95 and £220 a month", () => {
    expect(websiteQuote(oneOff({ care: "care" })).monthly).toBe(95);
    expect(websiteQuote(oneOff({ care: "carePlus" })).monthly).toBe(220);
  });

  it("never applies subscription pricing to a one-off website", () => {
    const q = websiteQuote(oneOff({ plan: "gold" }));
    expect(q.lines.some((l) => /Pro|Plus|Core/.test(l.label))).toBe(false);
    expect(q.setup).toBe(0);
  });
});

describe("content", () => {
  it("asks for a custom quote when copywriting or branding help is wanted", () => {
    const q = websiteQuote(
      monthly("silver", { content: { ...DEFAULT_WEBSITE_ANSWERS.content, needCopywriting: "yes", needBranding: "yes" } }),
    );
    expect(q.requiresQuote).toBe(true);
    expect(q.quoteReasons).toHaveLength(2);
    expect(q.monthly).toBe(149);
  });
});

describe("validation", () => {
  it("accepts well-formed answers and removes duplicate add-ons", () => {
    const parsed = parseWebsiteAnswers({ ...DEFAULT_WEBSITE_ANSWERS, addOns: ["blog", "blog"] });
    expect(parsed?.addOns).toEqual(["blog"]);
  });

  it("rejects unknown packages, bands, add-ons and modes", () => {
    expect(parseWebsiteAnswers({ ...DEFAULT_WEBSITE_ANSWERS, plan: "platinum" })).toBeNull();
    expect(parseWebsiteAnswers({ ...DEFAULT_WEBSITE_ANSWERS, pages: "1000" })).toBeNull();
    expect(parseWebsiteAnswers({ ...DEFAULT_WEBSITE_ANSWERS, addOns: ["free-money"] })).toBeNull();
    expect(parseWebsiteAnswers({ ...DEFAULT_WEBSITE_ANSWERS, mode: "lifetime" })).toBeNull();
    expect(parseWebsiteAnswers({ ...DEFAULT_WEBSITE_ANSWERS, content: { logo: "yes" } })).toBeNull();
    expect(parseWebsiteAnswers(null)).toBeNull();
  });

  it("summarises the quote for email with the first and monthly payments", () => {
    const a = monthly("silver", { pages: "11-15" });
    const text = formatWebsiteQuote(a, websiteQuote(a), formatGBP);
    expect(text).toContain("Package: Pro (monthly)");
    expect(text).toContain("First payment: £199");
    expect(text).toContain("Monthly subscription: £199");
    expect(text).toContain("rolling monthly, no minimum term");
    expect(text).not.toContain("Setup fee");
  });
});

describe("the starting page band", () => {
  it("matches each monthly package, so no package adds pages it doesn't include", () => {
    expect(bandForPlan("bronze")).toBe("4-5");
    expect(bandForPlan("silver")).toBe("6-10");
    expect(bandForPlan("gold")).toBe("16-20");
    for (const plan of ["bronze", "silver", "gold"] as const) {
      expect(websiteQuote(monthly(plan, { pages: bandForPlan(plan) })).extraPages).toBe(0);
    }
  });
  it("keeps the Core package at £99 a month when it starts on its own band", () => {
    expect(websiteQuote(monthly("bronze", { pages: "1-3" })).monthly).toBe(99);
  });
});
