import { describe, expect, it } from "vitest";
import { DEFAULT_ANSWERS } from "@/lib/pricing";
import { buildQuoteRecords, quoteReference, QUOTE_VALID_DAYS } from "@/lib/quote-records";
import { mapCatalogue, type CatalogueRows } from "@/lib/catalogue-mapping";
import { quote } from "@/lib/quote-engine";

/** The WNJO seed as database rows, exactly as migrations step2a and step2c write them. */
const SEED: CatalogueRows = {
  packages: [
    { code: "essential", name: "Essential", base_price_pence: 240000, included_design: "refined", active: true },
    { code: "professional", name: "Professional", base_price_pence: 450000, included_design: "refined", active: true },
    { code: "premium", name: "Premium", base_price_pence: 850000, included_design: "distinctive", active: true },
  ],
  features: [
    { code: "cms", label: "Content management", price_pence: 60000, requires_scope: false, scope_note: "", included_in_packages: ["professional", "premium"], active: true },
    { code: "payments", label: "Online payments", price_pence: 50000, requires_scope: false, scope_note: "", included_in_packages: [], active: true },
    { code: "booking", label: "Booking functionality", price_pence: 150000, requires_scope: false, scope_note: "", included_in_packages: [], active: true },
    { code: "ecommerce", label: "E-commerce catalogue", price_pence: 250000, requires_scope: false, scope_note: "", included_in_packages: [], active: true },
    { code: "accounts", label: "Customer accounts", price_pence: 120000, requires_scope: true, scope_note: "Customer accounts depend on your data and security needs.", included_in_packages: [], active: true },
    { code: "integrations", label: "Third-party integrations", price_pence: 60000, requires_scope: true, scope_note: "Integrations depend on the services involved.", included_in_packages: [], active: true },
    { code: "custom", label: "Custom features", price_pence: 0, requires_scope: true, scope_note: "Custom features are priced once we understand them.", included_in_packages: [], active: true },
  ],
  rates: [
    { kind: "copy_editing", code: "editing", band: "1-5", amount_pence: 35000 },
    { kind: "copy_editing", code: "editing", band: "6-12", amount_pence: 70000 },
    { kind: "copy_editing", code: "editing", band: "13-25", amount_pence: 130000 },
    { kind: "copy_writing", code: "writing", band: "1-5", amount_pence: 75000 },
    { kind: "copy_writing", code: "writing", band: "6-12", amount_pence: 150000 },
    { kind: "copy_writing", code: "writing", band: "13-25", amount_pence: 280000 },
    { kind: "imagery", code: "sourced", band: null, amount_pence: 25000 },
    { kind: "branding", code: "partial", band: null, amount_pence: 30000 },
    { kind: "branding", code: "none", band: null, amount_pence: 65000 },
    { kind: "design", code: "refined", band: null, amount_pence: 0 },
    { kind: "design", code: "distinctive", band: null, amount_pence: 90000 },
    { kind: "design", code: "signature", band: null, amount_pence: 240000 },
  ],
  carePlans: [
    { code: "none", name: "No plan", monthly_price_pence: 0, active: true },
    { code: "hosting", name: "Hosting", monthly_price_pence: 2500, active: true },
    { code: "care", name: "Care", monthly_price_pence: 9500, active: true },
    { code: "carePlus", name: "Care Plus", monthly_price_pence: 22000, active: true },
  ],
  settings: [
    { key: "soon_premium_bp", value: 1500 },
    { key: "range_spread_bp", value: 2000 },
    { key: "rounding_step_pence", value: 5000 },
  ],
};

const TENANT = "00000000-0000-4000-8000-000000000001";
const NOW = new Date("2026-11-06T12:00:00Z");

describe("catalogue mapping", () => {
  it("maps the WNJO seed to the same prices the engine was tested against", () => {
    const catalogue = mapCatalogue(SEED);
    expect(catalogue.packages.essential.basePricePence).toBe(240000);
    expect(catalogue.features.accounts.scopeNote).toBe("Customer accounts depend on your data and security needs.");
    expect(quote({ ...DEFAULT_ANSWERS, pageBand: "13-25", copy: "writing" }, catalogue).buildPence).toBeGreaterThan(0);
  });

  it("refuses to build a catalogue with a missing rate", () => {
    const incomplete = { ...SEED, rates: SEED.rates.filter((r) => r.code !== "sourced") };
    expect(() => mapCatalogue(incomplete)).toThrow(/imagery\/sourced/);
  });

  it("refuses to build a catalogue with a missing setting", () => {
    const incomplete = { ...SEED, settings: SEED.settings.filter((s) => s.key !== "range_spread_bp") };
    expect(() => mapCatalogue(incomplete)).toThrow(/range_spread_bp/);
  });

  it("ignores inactive packages, features and care plans", () => {
    const withInactive: CatalogueRows = {
      ...SEED,
      packages: [...SEED.packages, { code: "retired", name: "Retired", base_price_pence: 1, included_design: "refined", active: false }],
    };
    expect(mapCatalogue(withInactive).packages.retired).toBeUndefined();
  });
});

describe("quote records", () => {
  const catalogue = mapCatalogue(SEED);

  it("builds a quote that expires after the valid period and starts at version 1", () => {
    const records = buildQuoteRecords({
      tenantId: TENANT,
      reference: "Q-3FA91C0B",
      organizationId: null,
      enquiryId: null,
      answers: DEFAULT_ANSWERS,
      catalogue,
      now: NOW,
    });
    expect(records.quote.status).toBe("sent");
    expect(records.quote.latest_version).toBe(1);
    expect(records.version.version).toBe(1);
    const expiry = new Date(records.quote.expires_at).getTime();
    expect(expiry - NOW.getTime()).toBe(QUOTE_VALID_DAYS * 24 * 60 * 60 * 1000);
  });

  it("stores line items in order, and their sum equals the build total", () => {
    const answers = { ...DEFAULT_ANSWERS, pageBand: "6-12" as const, copy: "writing" as const, features: ["booking" as const] };
    const records = buildQuoteRecords({ tenantId: TENANT, reference: "Q-3FA91C0B", organizationId: null, enquiryId: null, answers, catalogue, now: NOW });
    expect(records.items.map((i) => i.position)).toEqual(records.items.map((_, i) => i));
    const sum = records.items.reduce((total, item) => total + item.amount_pence, 0);
    expect(sum).toBe(records.version.build_pence);
  });

  it("keeps a snapshot that does not change when the catalogue changes afterwards", () => {
    const mutable = mapCatalogue(SEED);
    const records = buildQuoteRecords({ tenantId: TENANT, reference: "Q-3FA91C0B", organizationId: null, enquiryId: null, answers: DEFAULT_ANSWERS, catalogue: mutable, now: NOW });
    const before = records.version.build_pence;
    mutable.packages.essential.basePricePence = 999999;
    expect(records.version.catalogue_snapshot.packages.essential.basePricePence).toBe(240000);
    expect(records.version.build_pence).toBe(before);
  });

  it("creates references in the Q-XXXXXXXX format", () => {
    expect(quoteReference(new Uint8Array([0x3f, 0xa9, 0x1c, 0x0b]))).toBe("Q-3FA91C0B");
    expect(quoteReference(new Uint8Array([0, 0, 0, 1]))).toMatch(/^Q-[0-9A-F]{8}$/);
  });
});
