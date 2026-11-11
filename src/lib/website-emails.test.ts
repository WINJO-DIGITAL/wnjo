import { afterEach, describe, expect, it, vi } from "vitest";
import { welcomeEmail, type SubscriptionEmailFacts } from "./website-emails";

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
    expect(subject).toBe("Welcome to WINJO DIGITAL [WS-ABC123]");
    expect(text).toContain("Hi Ada,");
    // The one thing they have to do: sign in and share their goals, pages and style.
    expect(text).toContain("tell us about your website");
    expect(text).toContain("goals, the pages you need and the style you like");
    expect(text).toContain("https://example.test/account");
  });

  it("does not say the website is already set up, or promise a call before they have sent anything", () => {
    const { text } = welcomeEmail(facts);
    expect(text).not.toContain("is set up");
    expect(text).not.toContain("we'll be in touch within one working day");
    expect(text).toContain("first payment for the Plus package has been received");
  });
});
