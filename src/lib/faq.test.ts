import { describe, expect, it } from "vitest";
import { faqs, FAQ_CATEGORIES, groupFaqs, matchesFaq } from "@/lib/faq";
import { DELIVERY, REFRESH, WEBSITE_PLANS } from "@/lib/pricing";

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
    expect(matchesFaq(payments, "backups")).toBe(false);
  });

  it("is not case sensitive", () => {
    expect(matchesFaq(payments, "vat")).toBe(true);
  });
});

describe("FAQ answers that must match the plans", () => {
  const answer = (q: string) => faqs.find((item) => item.q === q)!.a;
  const core = WEBSITE_PLANS.bronze;
  const plus = WEBSITE_PLANS.silver;
  const pro = WEBSITE_PLANS.gold;

  it("gives each plan its own refresh level", () => {
    const text = answer("What is WINJO Refresh?");
    expect(text).toContain(`${core.name} gets a visual refresh`);
    expect(text).toContain(`${plus.name} gets an enhanced refresh`);
    expect(text).toContain(`${pro.name} gets a complete refresh`);
    expect(text.indexOf(`${plus.name} gets an enhanced`)).toBeLessThan(text.indexOf(`${pro.name} gets a complete`));
    expect(REFRESH.levels.silver.name).toBe("Enhanced refresh");
    expect(REFRESH.levels.gold.name).toBe("Complete refresh");
  });

  it("does not call a managed website a from-scratch design", () => {
    expect(answer("Is a managed website a template?")).toContain("sector design");
    expect(answer("Is a managed website a template?")).toContain("designed from scratch");
  });

  it("matches the 14-day go-live promise", () => {
    expect(answer("How long does it take to launch?")).toContain(`${DELIVERY.liveWithinDays} days`);
    expect(answer("How long does it take to launch?")).not.toContain("don't promise dates");
  });
});
