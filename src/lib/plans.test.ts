import { describe, expect, it } from "vitest";
import { ONE_OFF_TIERS, ONE_OFF_WEBSITE, WEBSITE_PAGE_BANDS, type PackageId } from "./pricing";
import { packagePages, packagePlanCards } from "./plans";

describe("packagePages", () => {
  const ids = Object.keys(ONE_OFF_TIERS) as PackageId[];

  it("sells three bespoke tiers at the owner's starting prices", () => {
    expect(Object.values(ONE_OFF_TIERS).map((t) => [t.name, t.from])).toEqual([["Essential", 999], ["Professional", 1999], ["Premium", 2999]]);
    expect(ONE_OFF_WEBSITE.from).toBe(ONE_OFF_TIERS.essential.from);
  });

  it("shows each tier's own price and name on its card", () => {
    expect(packagePlanCards.map((c) => [c.name, c.price])).toEqual([["Essential", "£999"], ["Professional", "£1,999"], ["Premium", "£2,999"]]);
  });

  it("only passes page sizes the price form recognises", () => {
    for (const id of ids) expect(packagePages[id] in WEBSITE_PAGE_BANDS).toBe(true);
  });

  it("holds every package's pages without asking for more than it needs", () => {
    for (const id of ids) {
      const max = WEBSITE_PAGE_BANDS[packagePages[id]].max;
      expect(max === null || max >= ONE_OFF_TIERS[id].pageLimit).toBe(true);
    }
  });

  it("gives each package its own size", () => {
    expect(packagePages).toEqual({ essential: "4-5", professional: "6-10", premium: "16-20" });
  });

  it("puts that size on each package card's link", () => {
    for (const card of packagePlanCards) {
      expect(card.href).toBe(`/build/project?pages=${packagePages[card.id as PackageId]}`);
    }
  });
});
