import { describe, expect, it } from "vitest";
import { callbackPromise, canCallWithinHour, quoteEmail } from "@/lib/callback";

// Times are in UTC; in November, UK time is the same as UTC.
const at = (iso: string) => new Date(iso);

describe("call-back promise", () => {
  it("promises a call within the hour on a weekday morning", () => {
    expect(canCallWithinHour(at("2026-11-09T10:30:00Z"))).toBe(true);
    expect(callbackPromise(at("2026-11-09T10:30:00Z"))).toContain("within the hour");
  });

  it("promises next working day in the last hour before closing", () => {
    expect(canCallWithinHour(at("2026-11-09T16:15:00Z"))).toBe(false);
  });

  it("promises next working day at night and at weekends", () => {
    expect(callbackPromise(at("2026-11-09T21:00:00Z"))).toContain("next working day");
    expect(callbackPromise(at("2026-11-08T11:00:00Z"))).toContain("next working day");
  });

  it("uses UK time, including summer time", () => {
    // 8:30 UTC in July is 9:30 in the UK.
    expect(canCallWithinHour(at("2026-07-06T08:30:00Z"))).toBe(true);
  });
});

describe("quote email", () => {
  const email = quoteEmail({ name: "Sam Jones", quoteReference: "Q-0000AB12", low: 1800, high: 2150, siteUrl: "https://www.wnjoweb.co.uk/", callback: "We'll call you within the hour to talk it through." });

  it("names the quote in the subject", () => {
    expect(email.subject).toBe("Your WNJO quote Q-0000AB12");
  });

  it("gives the price range, the no-VAT note and how to accept", () => {
    expect(email.text).toContain("£1,800 to £2,150, with no VAT added");
    expect(email.text).toContain("sign in at https://www.wnjoweb.co.uk/account");
    expect(email.text.startsWith("Hi Sam,")).toBe(true);
  });
});
