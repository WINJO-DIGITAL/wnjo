import { describe, expect, it } from "vitest";
import { PACKAGES, WEBSITE_PAGE_BANDS, type PackageId } from "./pricing";
import { packagePages, packagePlanCards } from "./plans";

describe("packagePages", () => {
  const ids = Object.keys(PACKAGES) as PackageId[];

  it("only passes page sizes the price form recognises", () => {
    for (const id of ids) expect(packagePages[id] in WEBSITE_PAGE_BANDS).toBe(true);
  });

  it("holds every package's pages without asking for more than it needs", () => {
    for (const id of ids) {
      const max = WEBSITE_PAGE_BANDS[packagePages[id]].max;
      expect(max === null || max >= PACKAGES[id].pageLimit).toBe(true);
    }
  });

  it("gives each package its own size", () => {
    expect(packagePages).toEqual({ essential: "4-5", professional: "11-15", premium: "20+" });
  });

  it("puts that size on each package card's link", () => {
    for (const card of packagePlanCards) {
      expect(card.href).toBe(`/build/project?pages=${packagePages[card.id as PackageId]}`);
    }
  });
});
