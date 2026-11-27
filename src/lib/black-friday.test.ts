import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { BLACK_FRIDAY, CANCEL_FREE, FIRST_BILL_DAY, OFFER_HEADLINE, afterTrialLine, blackFridayActiveAt, blackFridayEligible, blackFridayFirstBillDate, blackFridayOf, msUntilBlackFridayEnds } from "./black-friday";
import { offerNowMs } from "./black-friday-clock";
import { checkoutParams, firstPaymentPence } from "./website-subscriptions";

const at = (iso: string) => Date.parse(iso);

describe("Black Friday offer window", () => {
  it("is on from Friday 27 November until Monday 30 November 23:59:59 UK time (GMT), and off after", () => {
    expect(blackFridayActiveAt(at("2026-11-26T23:59:59Z"))).toBe(false);
    expect(blackFridayActiveAt(at("2026-11-27T00:00:00Z"))).toBe(true);
    expect(blackFridayActiveAt(at("2026-11-28T12:00:00Z"))).toBe(true);
    expect(blackFridayActiveAt(at("2026-11-30T23:59:59.999Z"))).toBe(true);
    expect(blackFridayActiveAt(at("2026-12-01T00:00:00Z"))).toBe(false);
    expect(blackFridayActiveAt(at("2027-11-27T12:00:00Z"))).toBe(false);
    expect(blackFridayActiveAt(Number.NaN)).toBe(false);
  });

  it("counts down to the end, so an open page switches itself off on time", () => {
    expect(msUntilBlackFridayEnds(at("2026-11-30T23:59:00Z"))).toBe(59_999);
    expect(msUntilBlackFridayEnds(at("2026-12-01T00:00:00Z"))).toBe(0);
  });

  it("bills on day 15, after a 14-day trial", () => {
    expect(BLACK_FRIDAY.trialDays).toBe(14);
    expect(FIRST_BILL_DAY).toBe(15);
    expect(blackFridayFirstBillDate(new Date("2026-11-27T10:00:00Z")).toISOString()).toBe("2026-12-11T10:00:00.000Z");
  });

  it("applies only to a plan on its own: nothing upfront", () => {
    expect(blackFridayEligible({ mode: "monthly", setup: 0, oneOffTotal: 0, monthly: 149 })).toBe(true);
    expect(blackFridayEligible({ mode: "monthly", setup: 0, oneOffTotal: 99, monthly: 149 })).toBe(false);
    expect(blackFridayEligible({ mode: "monthly", setup: 995, oneOffTotal: 0, monthly: 149 })).toBe(false);
    expect(blackFridayEligible({ mode: "oneOff", setup: 0, oneOffTotal: 0, monthly: 0 })).toBe(false);
  });

  it("reads the offer back from a stored snapshot, and nothing else", () => {
    expect(blackFridayOf({ offer: { code: BLACK_FRIDAY.code, trialDays: 14, agreedAt: "x" } })).toMatchObject({ trialDays: 14 });
    expect(blackFridayOf({ offer: { code: "something-else" } })).toBeNull();
    expect(blackFridayOf(null)).toBeNull();
    expect(blackFridayOf({ consent: {} })).toBeNull();
  });
});

describe("the offer clock", () => {
  it("uses a test date on a preview or local build, but never in production", () => {
    expect(offerNowMs({ OFFER_CLOCK_OVERRIDE: "2026-12-01T00:00:00Z", VERCEL_ENV: "preview" })).toBe(at("2026-12-01T00:00:00Z"));
    expect(offerNowMs({ OFFER_CLOCK_OVERRIDE: "2026-12-01T00:00:00Z" })).toBe(at("2026-12-01T00:00:00Z"));
    const now = Date.now();
    expect(offerNowMs({ OFFER_CLOCK_OVERRIDE: "2026-12-01T00:00:00Z", VERCEL_ENV: "production" })).toBeGreaterThanOrEqual(now);
    expect(offerNowMs({ OFFER_CLOCK_OVERRIDE: "not a date", VERCEL_ENV: "preview" })).toBeGreaterThanOrEqual(now);
  });
});

describe("Stripe Checkout with the free trial", () => {
  const offer = { id: "sub-1", reference: "WS-ABC123", email: "ada@example.com", kind: "subscription" as const, packageCode: "silver" as const, packageName: "Plus", setupPence: 0, monthlyPence: 14900, oneOffPence: 0 };
  const trial = { days: BLACK_FRIDAY.trialDays, offerCode: BLACK_FRIDAY.code };

  it("asks Stripe for a 14-day trial, takes the card now, and still bills the plan's own price", () => {
    const p = checkoutParams(offer, { success: "s", cancel: "c" }, {}, trial);
    expect(p.get("mode")).toBe("subscription");
    expect(p.get("subscription_data[trial_period_days]")).toBe("14");
    expect(p.get("payment_method_collection")).toBe("always");
    expect(p.get("subscription_data[trial_settings][end_behavior][missing_payment_method]")).toBe("cancel");
    expect(p.get("line_items[0][price_data][unit_amount]")).toBe("14900");
    expect(p.get("metadata[offer]")).toBe(BLACK_FRIDAY.code);
    expect(p.get("subscription_data[metadata][offer]")).toBe(BLACK_FRIDAY.code);
  });

  it("never adds a trial to the standard checkout", () => {
    const p = checkoutParams(offer, { success: "s", cancel: "c" });
    expect(p.has("subscription_data[trial_period_days]")).toBe(false);
    expect(p.has("metadata[offer]")).toBe(false);
  });

  it("refuses a free trial on anything with an upfront charge, so nothing is ever charged at sign-up", () => {
    expect(() => checkoutParams({ ...offer, setupPence: 9900 }, { success: "s", cancel: "c" }, {}, trial)).toThrow();
    expect(() => checkoutParams({ ...offer, oneOffPence: 1 }, { success: "s", cancel: "c" }, {}, trial)).toThrow();
  });

  it("expects nothing at checkout for a free trial, and the first month otherwise", () => {
    expect(firstPaymentPence(offer, { freeTrial: true })).toBe(0);
    expect(firstPaymentPence(offer)).toBe(14900);
  });
});

describe("Black Friday copy: no minimum term", () => {
  it("says free for 14 days, then the price, and cancel before day 15 for nothing", () => {
    expect(OFFER_HEADLINE).toBe("FREE bespoke website for 14 days");
    expect(CANCEL_FREE).toBe("cancel before day 15 and pay nothing");
    expect(afterTrialLine(149)).toBe("then £149/mo · cancel before day 15 and pay nothing");
  });

  it("has no minimum term anywhere in the offer", () => {
    expect(Object.keys(BLACK_FRIDAY)).not.toContain("minimumTermMonths");
  });
});
