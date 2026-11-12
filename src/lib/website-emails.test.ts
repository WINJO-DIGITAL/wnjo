import { afterEach, describe, expect, it, vi } from "vitest";
import { welcomeEmail, oneOffPaidEmail, type SubscriptionEmailFacts } from "./website-emails";

const facts: SubscriptionEmailFacts = {
  reference: "WS-ABC123",
  name: "Ada Lovelace",
  packageName: "Plus",
  kind: "subscription",
  setupPence: 0,
  monthlyPence: 14900,
  oneOffPence: 0,
  ownershipAfterPayments: 0,
  minimumTermMonths: 0,
};

describe("welcome email", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("tells the customer what to do next, with a link to their account", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://example.test/");
    const { subject, text } = welcomeEmail(facts);
    expect(subject).toBe("Thank you. Now tell us about your website [WS-ABC123]");
    expect(text).toContain("Hi Ada,");
    // The one thing they have to do: sign in and share their goals, pages and style.
    expect(text).toContain("tell us about your website");
    expect(text).toContain("goals, the pages you need and the style you like");
    expect(text).toContain("https://example.test/account");
  });

  it("leads with the details form, before the payment details", () => {
    const { text } = welcomeEmail(facts);
    expect(text.indexOf("tell us about your website")).toBeLessThan(text.indexOf("Monthly payment"));
  });

  it("doesn't ask for details we already have, and says we're starting", () => {
    const { subject, text } = welcomeEmail({ ...facts, needsDetails: false });
    expect(subject).toBe("Welcome to WINJO DIGITAL [WS-ABC123]");
    expect(text).not.toContain("tell us about your website");
    expect(text).toContain("We already have your details");
  });

  it("does not say the website is already set up, or promise a call before they have sent anything", () => {
    const { text } = welcomeEmail(facts);
    expect(text).not.toContain("is set up");
    expect(text).not.toContain("we'll be in touch within one working day");
    expect(text).toContain("first payment for the Plus package has been received");
  });
});

describe("one-off payment email", () => {
  const oneOff = { ...facts, kind: "one_off" as const, oneOffPence: 49950, monthlyPence: 0 };

  it("asks for the details form, with the link, when we still need it", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://example.test/");
    const { subject, text } = oneOffPaidEmail(oneOff);
    expect(subject).toBe("Payment received. Now tell us about your website [WS-ABC123]");
    expect(text).toContain("tell us about your website");
    expect(text).toContain("https://example.test/account");
    vi.unstubAllEnvs();
  });

  it("just confirms the payment when we already have the details", () => {
    const { subject, text } = oneOffPaidEmail({ ...oneOff, needsDetails: false });
    expect(subject).toBe("Payment received [WS-ABC123]");
    expect(text).not.toContain("tell us about your website");
    expect(text).toContain("We already have your details");
  });
});
