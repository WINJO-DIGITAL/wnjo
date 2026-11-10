import { describe, expect, it } from "vitest";
import { quoteEmail } from "@/lib/quote-email";

describe("quote email", () => {
  const email = quoteEmail({ name: "Sam Jones", quoteReference: "Q-0000AB12", low: 1800, high: 2150, siteUrl: "https://winjodigital.co.uk/" });

  it("names the quote in the subject", () => {
    expect(email.subject).toBe("Your quote [Q-0000AB12]");
  });

  it("gives the price range, the no-VAT note and how to accept", () => {
    expect(email.text).toContain("£1,800 to £2,150. No VAT is added.");
    expect(email.text).toContain("sign in at https://winjodigital.co.uk/account");
    expect(email.text.startsWith("Hi Sam,")).toBe(true);
  });

  it("promises no call or reply time", () => {
    expect(email.text).not.toMatch(/call|within|hour/i);
  });
});
