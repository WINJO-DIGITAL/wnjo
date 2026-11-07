import { describe, expect, it } from "vitest";
import { faqs, FAQ_CATEGORIES, groupFaqs, matchesFaq } from "@/lib/faq";

describe("FAQ grouping", () => {
  it("puts every question in a category", () => {
    for (const item of faqs) {
      expect(FAQ_CATEGORIES.map((c) => c.id)).toContain(item.category);
    }
  });

  it("leaves out categories with no questions", () => {
    const titles = groupFaqs().map((g) => g.title);
    expect(titles).not.toContain("Bookings and functionality");
    expect(titles).toContain("Pricing");
  });

  it("keeps every question once", () => {
    const total = groupFaqs().reduce((n, g) => n + g.items.length, 0);
    expect(total).toBe(faqs.length);
  });
});

describe("FAQ search", () => {
  const payments = faqs.find((f) => f.q === "How do payments work?")!;

  it("shows everything for an empty search", () => {
    expect(matchesFaq(payments, "   ")).toBe(true);
  });

  it("matches words in the question or the answer, in any order", () => {
    expect(matchesFaq(payments, "VAT payments")).toBe(true);
    expect(matchesFaq(payments, "hosting")).toBe(false);
  });

  it("is not case sensitive", () => {
    expect(matchesFaq(payments, "vat")).toBe(true);
  });
});
