import { describe, expect, it } from "vitest";
import { hostingOfferAmounts } from "./website-offers";
import { checkoutParams } from "./website-subscriptions";
import { welcomeEmail, hostingPayLinkEmail } from "./website-emails";

describe("a hosting offer", () => {
  it("charges the plan's monthly price from the one price list, with nothing upfront", () => {
    expect(hostingOfferAmounts("hosting")).toMatchObject({ kind: "subscription", packageCode: "hosting", packageName: "Hosting", monthlyPence: 4900, setupPence: 0, oneOffPence: 0 });
    expect(hostingOfferAmounts("care")).toMatchObject({ packageCode: "care", monthlyPence: 9500 });
    expect(hostingOfferAmounts("carePlus")).toMatchObject({ packageCode: "care_plus", monthlyPence: 22000 });
  });

  it("opens a monthly Stripe subscription named as a plan, not a website package", () => {
    const p = checkoutParams({ id: "o1", reference: "WS-ABC123", email: "a@b.co.uk", ...hostingOfferAmounts("care") }, { success: "https://x/ok", cancel: "https://x/no" }, { product: "hosting" });
    expect(p.get("mode")).toBe("subscription");
    expect(p.get("line_items[0][price_data][unit_amount]")).toBe("9500");
    expect(p.get("line_items[0][price_data][recurring][interval]")).toBe("month");
    expect(p.get("line_items[0][price_data][product_data][name]")).toBe("Care hosting plan");
    expect(p.get("subscription_data[description]")).toBe("Care hosting plan (WS-ABC123)");
    expect(p.get("line_items[1][quantity]")).toBeNull();
    expect(p.get("metadata[product]")).toBe("hosting");
  });

  it("still names a managed website plan a website package", () => {
    const p = checkoutParams({ id: "o1", reference: "WS-ABC123", email: "a@b.co.uk", kind: "subscription", packageCode: "bronze", packageName: "Core", setupPence: 0, monthlyPence: 9900, oneOffPence: 0 }, { success: "s", cancel: "c" });
    expect(p.get("line_items[0][price_data][product_data][name]")).toBe("Core website package");
  });
});

describe("hosting emails", () => {
  const base = { reference: "WS-ABC123", name: "Sam Rivers", packageName: "Care hosting", kind: "subscription" as const, setupPence: 0, monthlyPence: 9500, oneOffPence: 0, ownershipAfterPayments: 0, minimumTermMonths: 0 };

  it("welcomes a hosting customer without asking for website goals or mentioning ownership", () => {
    const m = welcomeEmail({ ...base, hosting: { siteUrl: "riverscafe.co.uk", websiteStatus: "have" } });
    expect(m.subject).toBe("Your hosting is active [WS-ABC123]");
    expect(m.text).toContain("connect your hosting to riverscafe.co.uk");
    expect(m.text).toContain("£95");
    expect(m.text).toContain("30 days' notice");
    expect(m.text).not.toMatch(/goals|pages and style|ownership/i);
  });

  it("offers a way to get a website to someone who needs one", () => {
    const m = welcomeEmail({ ...base, hosting: { siteUrl: "", websiteStatus: "need" } });
    expect(m.text).toContain("Need a website as well?");
    expect(m.text).toContain("/website-projects");
  });

  it("still welcomes a website plan customer as before", () => {
    const m = welcomeEmail({ ...base, packageName: "Core", needsDetails: true });
    expect(m.subject).toMatch(/tell us about your website/i);
  });

  it("sends a hosting payment link that doesn't talk about a website", () => {
    const m = hostingPayLinkEmail(base, "https://winjodigital.co.uk/subscribe/abc");
    expect(m.text).toContain("https://winjodigital.co.uk/subscribe/abc");
    expect(m.text).not.toMatch(/start your website/i);
  });
});
