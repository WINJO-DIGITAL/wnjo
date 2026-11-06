import type { Catalogue } from "@/lib/quote-engine";

/** Rows as stored in the pricing tables (see migrations step2a and step2c). */
export type CatalogueRows = {
  packages: { code: string; name: string; base_price_pence: number; included_design: string; active: boolean }[];
  features: {
    code: string;
    label: string;
    price_pence: number;
    requires_scope: boolean;
    scope_note: string;
    included_in_packages: string[];
    active: boolean;
  }[];
  rates: { kind: string; code: string; band: string | null; amount_pence: number }[];
  carePlans: { code: string; name: string; monthly_price_pence: number; active: boolean }[];
  settings: { key: string; value: number }[];
};

/**
 * Turns database rows into the engine's catalogue. Fails loudly if the catalogue is incomplete,
 * so a quote is never produced from partial prices.
 */
export function mapCatalogue(rows: CatalogueRows): Catalogue {
  const rate = (kind: string, code: string, band: string | null) => {
    const found = rows.rates.find((r) => r.kind === kind && r.code === code && r.band === band);
    if (!found) throw new Error(`Pricing catalogue is missing ${kind}/${code}${band ? `/${band}` : ""}`);
    return found.amount_pence;
  };
  const setting = (key: string) => {
    const found = rows.settings.find((s) => s.key === key);
    if (!found) throw new Error(`Pricing catalogue is missing the setting ${key}`);
    return found.value;
  };
  const packages: Catalogue["packages"] = {};
  for (const p of rows.packages.filter((p) => p.active)) {
    packages[p.code] = { name: p.name, basePricePence: p.base_price_pence, includedDesign: p.included_design };
  }
  const features: Catalogue["features"] = {};
  for (const f of rows.features.filter((f) => f.active)) {
    features[f.code] = {
      label: f.label,
      pricePence: f.price_pence,
      requiresScope: f.requires_scope,
      scopeNote: f.scope_note,
      includedInPackages: f.included_in_packages,
    };
  }
  const carePlans: Catalogue["carePlans"] = {};
  for (const c of rows.carePlans.filter((c) => c.active)) {
    carePlans[c.code] = { name: c.name, monthlyPricePence: c.monthly_price_pence };
  }
  return {
    packages,
    features,
    copyRates: {
      editing: { "1-5": rate("copy_editing", "editing", "1-5"), "6-12": rate("copy_editing", "editing", "6-12"), "13-25": rate("copy_editing", "editing", "13-25") },
      writing: { "1-5": rate("copy_writing", "writing", "1-5"), "6-12": rate("copy_writing", "writing", "6-12"), "13-25": rate("copy_writing", "writing", "13-25") },
    },
    imageryPricePence: rate("imagery", "sourced", null),
    brandingPricePence: { partial: rate("branding", "partial", null), none: rate("branding", "none", null) },
    designPricePence: {
      refined: rate("design", "refined", null),
      distinctive: rate("design", "distinctive", null),
      signature: rate("design", "signature", null),
    },
    carePlans,
    settings: {
      soonPremiumBp: setting("soon_premium_bp"),
      rangeSpreadBp: setting("range_spread_bp"),
      roundingStepPence: setting("rounding_step_pence"),
    },
  };
}
