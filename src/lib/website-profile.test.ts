import { describe, expect, it } from "vitest";
import { buildPlanPrompt } from "./ai/website-plan";
import { EMPTY_BRIEF, cleanBrief, cleanProfile, profileLines, validateProfile, type WebsiteBrief } from "./website-brief";

const other: WebsiteBrief = {
  ...EMPTY_BRIEF,
  goals: ["bookings"],
  otherBusinessType: "Airport transfer company",
  profile: { ...EMPTY_BRIEF.profile, services: "Airport transfer £35\nLong distance by quote", phone: "07700 900123", differentiator: "Fixed prices, meet and greet" },
};

describe("the business profile", () => {
  it("keeps only the choices it knows, and trims the rest", () => {
    const p = cleanProfile({ services: " Cut ", customers: "everyone", tone: "premium", firstActions: ["book", "fly", "book"], email: "HELLO@Example.com" });
    expect(p).toMatchObject({ services: "Cut", customers: "", tone: "premium", firstActions: ["book"], email: "hello@example.com" });
  });

  it("is kept on the brief, and cleaned with it", () => {
    expect(cleanBrief({ otherBusinessType: "Florist", profile: { differentiator: "Same-day delivery" } }).profile.differentiator).toBe("Same-day delivery");
    expect(cleanBrief({}).profile.services).toBe("");
  });

  it("needs what a website can't be written without, and a contact", () => {
    expect(validateProfile(other)).toEqual({});
    const missing = validateProfile({ ...other, profile: { ...EMPTY_BRIEF.profile } });
    expect(Object.keys(missing).sort()).toEqual(["differentiator", "phone", "services"]);
    expect(validateProfile({ ...other, profile: { ...other.profile, phone: "", email: "not an email" } }).email).toBe("Check the email address.");
  });

  it("is not checked for a brief with a template, or with no other type", () => {
    expect(validateProfile({ ...EMPTY_BRIEF, otherBusinessType: "" })).toEqual({});
  });

  it("is in the staff summary, leaving out empty answers", () => {
    const lines = profileLines(other.profile);
    expect(lines).toContain("Phone: 07700 900123");
    expect(lines).toContain("What makes them different: Fixed prices, meet and greet");
    expect(lines.some((l) => l.startsWith("Email"))).toBe(false);
    expect(lines.some((l) => l.startsWith("Hours"))).toBe(false);
  });

  it("reaches the writer as the customer's own answers", () => {
    const prompt = buildPlanPrompt({ businessName: "BFW", packageName: "Core", pagesAllowed: 5, brief: other });
    expect(prompt).toContain("Business type: Airport transfer company");
    expect(prompt).toContain("Customer's answer. Offers: Airport transfer £35; Long distance by quote");
    expect(prompt).toContain("Customer's answer. What makes them different: Fixed prices, meet and greet");
  });
});
