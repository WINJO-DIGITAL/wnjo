import { describe, expect, it } from "vitest";
import { DEFAULT_ANSWERS, estimate, FEATURES, type Answers, type Feature } from "@/lib/pricing";
import { quote, type Catalogue } from "@/lib/quote-engine";

/**
 * The catalogue below mirrors the WNJO seed in the database (migrations step2a and step2c),
 * written in pence. If these ever disagree, the seed and the rules have drifted.
 */
const WNJO_CATALOGUE: Catalogue = {
  packages: {
    essential: { name: "Essential", basePricePence: 240000, includedDesign: "refined" },
    professional: { name: "Professional", basePricePence: 450000, includedDesign: "refined" },
    premium: { name: "Premium", basePricePence: 850000, includedDesign: "distinctive" },
  },
  features: {
    cms: { label: "Content management", pricePence: 60000, requiresScope: false, scopeNote: "", includedInPackages: ["professional", "premium"] },
    payments: { label: "Online payments", pricePence: 50000, requiresScope: false, scopeNote: "", includedInPackages: [] },
    booking: { label: "Booking functionality", pricePence: 150000, requiresScope: false, scopeNote: "", includedInPackages: [] },
    ecommerce: { label: "E-commerce catalogue", pricePence: 250000, requiresScope: false, scopeNote: "", includedInPackages: [] },
    accounts: { label: "Customer accounts", pricePence: 120000, requiresScope: true, scopeNote: "Customer accounts depend on your data and security needs.", includedInPackages: [] },
    integrations: { label: "Third-party integrations", pricePence: 60000, requiresScope: true, scopeNote: "Integrations depend on the services involved.", includedInPackages: [] },
    custom: { label: "Custom features", pricePence: 0, requiresScope: true, scopeNote: "Custom features are priced once we understand them.", includedInPackages: [] },
  },
  copyRates: {
    editing: { "1-5": 35000, "6-12": 70000, "13-25": 130000 },
    writing: { "1-5": 75000, "6-12": 150000, "13-25": 280000 },
  },
  imageryPricePence: 25000,
  brandingPricePence: { partial: 30000, none: 65000 },
  designPricePence: { refined: 0, distinctive: 90000, signature: 240000 },
  carePlans: {
    none: { name: "No plan", monthlyPricePence: 0 },
    hosting: { name: "Hosting", monthlyPricePence: 4900 },
    care: { name: "Care", monthlyPricePence: 9500 },
    carePlus: { name: "Care Plus", monthlyPricePence: 22000 },
  },
  settings: { soonPremiumBp: 1500, rangeSpreadBp: 2000, roundingStepPence: 5000 },
};

const ALL_FEATURES = Object.keys(FEATURES) as Feature[];

/** Every combination of the main answers, with a few feature sets. */
function* combinations(): Generator<Answers> {
  const featureSets: Feature[][] = [[], ALL_FEATURES, ...ALL_FEATURES.map((f) => [f])];
  const projectTypes = ["business", "portfolio", "shop", "booking", "webapp", "unsure"] as const;
  const bands = ["1-5", "6-12", "13-25", "26+"] as const;
  const copies = ["provided", "editing", "writing"] as const;
  const imageries = ["provided", "sourced"] as const;
  const brandings = ["established", "partial", "none"] as const;
  const designs = ["refined", "distinctive", "signature"] as const;
  const timings = ["flexible", "quarter", "soon", "date"] as const;
  const cares = ["none", "hosting", "care", "carePlus"] as const;
  for (const projectType of projectTypes)
    for (const pageBand of bands)
      for (const copy of copies)
        for (const imagery of imageries)
          for (const branding of brandings)
            for (const designLevel of designs)
              for (const timing of timings)
                for (const carePlan of cares)
                  for (const features of featureSets)
                    yield { ...DEFAULT_ANSWERS, projectType, pageBand, copy, imagery, branding, designLevel, timing, carePlan, features };
}

describe("quote engine matches the current pricing rules", { timeout: 60_000 }, () => {
  it("produces the same package, total, range, care price and scope for every combination", () => {
    let checked = 0;
    for (const answers of combinations()) {
      const old = estimate(answers);
      const next = quote(answers, WNJO_CATALOGUE);
      checked++;
      expect(next.packageCode, JSON.stringify(answers)).toBe(old.packageId);
      expect(next.buildPence, JSON.stringify(answers)).toBe(old.build * 100);
      expect(next.rangePence).toEqual({ low: old.range.low * 100, high: old.range.high * 100 });
      expect(next.monthlyPence).toBe(old.monthly * 100);
      expect(next.requiresScope).toBe(old.requiresScope);
      expect(next.scopeReasons.slice().sort()).toEqual(old.scopeReasons.slice().sort());
    }
    expect(checked).toBeGreaterThan(10000);
  });

  it("produces the same line items, in the same order, as the current calculator", () => {
    for (const answers of combinations()) {
      const old = estimate(answers);
      const next = quote(answers, WNJO_CATALOGUE);
      expect(next.lineItems).toEqual(old.lineItems.map((i) => ({ label: i.label, amountPence: i.amount * 100 })));
    }
  });
});

describe("quote engine safety", () => {
  it("never charges a feature twice when the package already includes it", () => {
    const result = quote({ ...DEFAULT_ANSWERS, pageBand: "6-12", features: ["cms"] }, WNJO_CATALOGUE);
    expect(result.lineItems.some((i) => i.label === "Content management")).toBe(false);
  });

  it("refuses to price when the catalogue is missing a rate", () => {
    const broken = { ...WNJO_CATALOGUE, copyRates: { editing: {}, writing: {} } };
    expect(() => quote({ ...DEFAULT_ANSWERS, copy: "editing" }, broken)).toThrow(/no copy rate/);
  });

  it("uses only the catalogue it is given, so changing a price changes the next quote", () => {
    const cheaper = { ...WNJO_CATALOGUE, packages: { ...WNJO_CATALOGUE.packages, essential: { ...WNJO_CATALOGUE.packages.essential, basePricePence: 100000 } } };
    const before = quote(DEFAULT_ANSWERS, WNJO_CATALOGUE).buildPence;
    const after = quote(DEFAULT_ANSWERS, cheaper).buildPence;
    expect(after).toBe(before - 140000);
  });
});
