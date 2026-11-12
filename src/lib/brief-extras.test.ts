import { describe, expect, it } from "vitest";
import { cleanExtras, EMPTY_EXTRAS, extrasRows } from "./brief-extras";

describe("cleanExtras", () => {
  it("keeps the answers and drops anything unknown", () => {
    const e = cleanExtras({ role: "owner", pricingStyle: "cash", measures: ["calls", "fame", "calls"], legal: ["privacy", "nope"], mainService: " Airport transfer " });
    expect(e.role).toBe("owner");
    expect(e.pricingStyle).toBe("");
    expect(e.measures).toEqual(["calls"]);
    expect(e.legal).toEqual(["privacy"]);
    expect(e.mainService).toBe("Airport transfer");
  });

  it("treats a missing or old brief as empty", () => {
    expect(cleanExtras(undefined)).toEqual(EMPTY_EXTRAS);
    expect(cleanExtras("x")).toEqual(EMPTY_EXTRAS);
  });

  it("strips tags and trims to the limits", () => {
    expect(cleanExtras({ dontDo: "<b>No weddings</b>" }).dontDo).toBe("No weddings");
    expect(cleanExtras({ socials: "x".repeat(900) }).socials).toHaveLength(500);
  });
});

describe("extrasRows", () => {
  it("shows each answer under its full question, leaving out empty ones", () => {
    const rows = extrasRows({ role: "manager", measures: ["bookings", "calls"], legal: ["terms"] });
    expect(rows).toContainEqual(["What is your role in the business?", "Manager"]);
    expect(rows).toContainEqual(["How will you know the website is working?", "Bookings, Calls"]);
    expect(rows).toContainEqual(["Which legal pages do you need?", "Terms of service"]);
    expect(rows.some(([label]) => label.startsWith("Where else"))).toBe(false);
  });

  it("is empty for an empty brief", () => {
    expect(extrasRows(EMPTY_EXTRAS)).toEqual([]);
  });
});
