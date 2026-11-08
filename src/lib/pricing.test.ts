import { describe, expect, it } from "vitest";
import { DEFAULT_ANSWERS, PACKAGES, estimate, parseAnswers, recommendPackage, type Answers } from "./pricing";

const answers = (overrides: Partial<Answers> = {}): Answers => ({ ...DEFAULT_ANSWERS, ...overrides });

describe("recommendPackage", () => {
  it("maps page bands to packages", () => {
    expect(recommendPackage(answers({ pageBand: "1-5" }))).toBe("essential");
    expect(recommendPackage(answers({ pageBand: "6-12" }))).toBe("professional");
    expect(recommendPackage(answers({ pageBand: "13-25" }))).toBe("premium");
    expect(recommendPackage(answers({ pageBand: "26+" }))).toBe("premium");
  });
  it("moves signature design to premium", () => {
    expect(recommendPackage(answers({ designLevel: "signature" }))).toBe("premium");
  });
});

describe("estimate", () => {
  it("prices the default brief at the Essential starting price", () => {
    const e = estimate(answers());
    expect(e.packageId).toBe("essential");
    expect(e.build).toBe(PACKAGES.essential.from);
    expect(e.fixedScope).toBe(true);
    expect(e.requiresScope).toBe(false);
    expect(e.monthly).toBe(95);
  });

  it("sums line items into the build figure", () => {
    const e = estimate(answers({ copy: "writing", imagery: "sourced", features: ["payments"], branding: "none" }));
    expect(e.build).toBe(e.lineItems.reduce((s, i) => s + i.amount, 0));
    expect(e.build).toBe(2400 + 750 + 250 + 500 + 650);
  });

  it("does not charge for content management where the package includes it", () => {
    const e = estimate(answers({ pageBand: "6-12", features: ["cms"] }));
    expect(e.lineItems.some((i) => i.label === "Content management")).toBe(false);
    expect(estimate(answers({ features: ["cms"] })).build).toBe(2400 + 600);
  });

  it("adds e-commerce and payments for online shops without double counting", () => {
    const e = estimate(answers({ projectType: "shop", features: ["payments"] }));
    expect(e.build).toBe(2400 + 500 + 2500);
  });

  it("only charges the design difference above what the package includes", () => {
    expect(estimate(answers({ pageBand: "13-25", designLevel: "distinctive" })).build).toBe(8500);
    expect(estimate(answers({ pageBand: "13-25", designLevel: "signature" })).build).toBe(8500 + 1500);
  });

  it("applies the shorter timeline premium and requires scope confirmation", () => {
    const e = estimate(answers({ timing: "soon" }));
    // 15% of £2,400 is £360, rounded to the nearest £50.
    expect(e.build).toBe(2400 + 350);
    expect(e.requiresScope).toBe(true);
  });

  it("requires scope confirmation for bespoke or ambiguous work", () => {
    for (const a of [
      answers({ projectType: "webapp" }),
      answers({ projectType: "unsure" }),
      answers({ pageBand: "26+" }),
      answers({ features: ["custom"] }),
      answers({ features: ["accounts"] }),
      answers({ features: ["integrations"] }),
    ]) {
      const e = estimate(a);
      expect(e.requiresScope).toBe(true);
      expect(e.fixedScope).toBe(false);
      expect(e.scopeReasons.length).toBeGreaterThan(0);
    }
  });

  it("produces a range whose upper bound is never below the build figure", () => {
    const e = estimate(answers({ pageBand: "6-12", copy: "editing" }));
    expect(e.range.low).toBe(e.build);
    expect(e.range.high).toBeGreaterThanOrEqual(e.build);
    expect(e.range.high % 50).toBe(0);
  });
});

describe("parseAnswers", () => {
  it("accepts valid answers", () => {
    expect(parseAnswers({ ...DEFAULT_ANSWERS, features: ["cms", "cms"] })).toEqual({
      ...DEFAULT_ANSWERS,
      features: ["cms"],
    });
  });
  it("rejects unknown values and prototype keys", () => {
    expect(parseAnswers(null)).toBeNull();
    expect(parseAnswers({ ...DEFAULT_ANSWERS, pageBand: "1000" })).toBeNull();
    expect(parseAnswers({ ...DEFAULT_ANSWERS, carePlan: "toString" })).toBeNull();
    expect(parseAnswers({ ...DEFAULT_ANSWERS, features: ["teleport"] })).toBeNull();
    expect(parseAnswers({ ...DEFAULT_ANSWERS, features: "cms" })).toBeNull();
  });
});
