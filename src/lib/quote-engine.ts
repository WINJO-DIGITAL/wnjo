import { FEATURES, type Answers, type Feature } from "@/lib/pricing";

/**
 * The server-side quote engine. It prices an enquiry from a catalogue that the database holds,
 * so the agency owner can change prices without a code change. Amounts are integer pence.
 *
 * The engine is pure: it takes the catalogue as an argument and never reads the database itself.
 * The caller loads the catalogue for the tenant, runs the engine, and stores the result as an
 * immutable quote version (see quote_versions in the database).
 */

export type CatalogueFeature = {
  label: string;
  pricePence: number;
  requiresScope: boolean;
  /** Shown to the customer when the feature makes a quote need scoping. */
  scopeNote: string;
  includedInPackages: string[];
};
export type CataloguePackage = { name: string; basePricePence: number; includedDesign: string };
export type CatalogueCarePlan = { name: string; monthlyPricePence: number };

export type Catalogue = {
  packages: Record<string, CataloguePackage>;
  features: Record<string, CatalogueFeature>;
  /** Copy rates by kind and page band, e.g. copyRates.editing["1-5"]. */
  copyRates: { editing: Record<string, number>; writing: Record<string, number> };
  imageryPricePence: number;
  brandingPricePence: { partial: number; none: number };
  designPricePence: Record<string, number>;
  carePlans: Record<string, CatalogueCarePlan>;
  settings: { soonPremiumBp: number; rangeSpreadBp: number; roundingStepPence: number };
};

export type LineItem = { label: string; amountPence: number };

export type QuoteResult = {
  packageCode: string;
  lineItems: LineItem[];
  buildPence: number;
  rangePence: { low: number; high: number };
  monthlyPence: number;
  requiresScope: boolean;
  scopeReasons: string[];
};

const roundTo = (n: number, step: number) => Math.round(n / step) * step;

const PACKAGE_LABEL: Record<string, string> = { essential: "Essential", professional: "Professional", premium: "Premium" };
const COPY_BAND: Record<string, string> = { "1-5": "1-5", "6-12": "6-12", "13-25": "13-25", "26+": "13-25" };

/** Features implied by the project type, merged with the visitor's choices. */
export function effectiveFeatures(answers: Pick<Answers, "projectType" | "features">): Feature[] {
  const set = new Set<string>(answers.features);
  if (answers.projectType === "shop") {
    set.add("ecommerce");
    set.add("payments");
  }
  if (answers.projectType === "booking") set.add("booking");
  // Canonical order, so line items always come out in the same sequence.
  return (Object.keys(FEATURES) as Feature[]).filter((f) => set.has(f));
}

export function recommendPackage(answers: Pick<Answers, "pageBand" | "designLevel">): string {
  if (answers.pageBand === "13-25" || answers.pageBand === "26+" || answers.designLevel === "signature") return "premium";
  if (answers.pageBand === "6-12") return "professional";
  return "essential";
}

export function quote(answers: Answers, catalogue: Catalogue): QuoteResult {
  const packageCode = recommendPackage(answers);
  const pkg = catalogue.packages[packageCode];
  if (!pkg) throw new Error(`Catalogue has no package "${packageCode}"`);
  const features = effectiveFeatures(answers);
  const lineItems: LineItem[] = [{ label: `${PACKAGE_LABEL[packageCode] ?? packageCode} package`, amountPence: pkg.basePricePence }];
  const scopeReasons: string[] = [];
  const step = catalogue.settings.roundingStepPence;

  // Content
  if (answers.copy !== "provided") {
    const band = COPY_BAND[answers.pageBand];
    const amount = catalogue.copyRates[answers.copy][band];
    if (amount === undefined) throw new Error(`Catalogue has no copy rate for band "${band}"`);
    lineItems.push({ label: answers.copy === "editing" ? "Copy editing" : "Copywriting", amountPence: amount });
  }
  if (answers.imagery === "sourced") {
    lineItems.push({ label: "Licensed imagery sourcing", amountPence: catalogue.imageryPricePence });
  }

  // Functionality (features already in the package are not charged twice)
  for (const f of features) {
    const feature = catalogue.features[f];
    if (!feature) throw new Error(`Catalogue has no feature "${f}"`);
    if (feature.includedInPackages.includes(packageCode)) continue;
    if (feature.pricePence > 0) lineItems.push({ label: feature.label, amountPence: feature.pricePence });
  }

  // Design
  if (answers.branding !== "established") {
    lineItems.push({
      label: answers.branding === "partial" ? "Web palette from existing logo" : "Simple visual identity",
      amountPence: catalogue.brandingPricePence[answers.branding],
    });
  }
  const designPrice = catalogue.designPricePence[answers.designLevel];
  const includedDesign = pkg.includedDesign;
  const designDelta = designPrice - catalogue.designPricePence[includedDesign];
  if (designDelta > 0) {
    lineItems.push({ label: `${capitalise(answers.designLevel)} design level`, amountPence: designDelta });
  }

  const subtotal = lineItems.reduce((sum, item) => sum + item.amountPence, 0);
  if (answers.timing === "soon") {
    lineItems.push({
      label: "Shorter timeline",
      amountPence: roundTo((subtotal * catalogue.settings.soonPremiumBp) / 10000, step),
    });
  }
  const buildPence = lineItems.reduce((sum, item) => sum + item.amountPence, 0);

  // Scope rules: ambiguous work is never priced as a binding figure
  if (answers.projectType === "webapp") scopeReasons.push("Bespoke web applications are always scoped individually.");
  if (answers.projectType === "unsure") scopeReasons.push("We'll recommend the right approach on a short call.");
  if (answers.pageBand === "26+") scopeReasons.push("Sites over 25 pages are scoped individually.");
  for (const f of features) {
    const feature = catalogue.features[f];
    if (feature?.requiresScope) scopeReasons.push(feature.scopeNote);
  }
  if (answers.timing === "soon" || answers.timing === "date") {
    scopeReasons.push("Delivery dates are confirmed against availability before work is booked.");
  }

  const care = catalogue.carePlans[answers.carePlan];
  if (!care) throw new Error(`Catalogue has no care plan "${answers.carePlan}"`);

  return {
    packageCode,
    lineItems,
    buildPence,
    rangePence: {
      low: buildPence,
      high: roundTo((buildPence * (10000 + catalogue.settings.rangeSpreadBp)) / 10000, step),
    },
    monthlyPence: care.monthlyPricePence,
    requiresScope: scopeReasons.length > 0,
    scopeReasons,
  };
}

function capitalise(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
