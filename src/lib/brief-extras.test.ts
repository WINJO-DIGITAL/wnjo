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

describe("budget and deadline for a website bought outright", () => {
  it("are cleaned to the known choices and shown first on the staff page, under their questions", () => {
    const e = cleanExtras({ budget: "2k-5k", deadline: "1-3m" });
    expect(e.budget).toBe("2k-5k");
    expect(e.deadline).toBe("1-3m");
    expect(extrasRows({ budget: "2k-5k", deadline: "1-3m", role: "owner" }).slice(0, 3)).toEqual([
      ["What is your budget?", "£2,000 to £5,000"],
      ["When would you like it by?", "Within 1 to 3 months"],
      ["What is your role in the business?", "Owner"],
    ]);
  });

  it("drop anything that isn't a known choice, and are left out when empty", () => {
    expect(cleanExtras({ budget: "a million", deadline: "yesterday" })).toMatchObject({ budget: "", deadline: "" });
    expect(extrasRows({})).toEqual([]);
  });
});

