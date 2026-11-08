import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { paymentMatches, stripeSecretKey, testSecretKey, verifyStripeSignature } from "@/lib/stripe";

const secret = "whsec_test_example";
const payload = '{"id":"evt_1","type":"checkout.session.completed"}';
const now = 1_800_000_000;

function sign(body: string, ts: number, key = secret) {
  const sig = createHmac("sha256", key).update(`${ts}.${body}`).digest("hex");
  return `t=${ts},v1=${sig}`;
}

describe("verifyStripeSignature", () => {
  it("accepts a correctly signed, recent payload", () => {
    expect(verifyStripeSignature(payload, sign(payload, now), secret, now)).toBe(true);
  });

  it("rejects a payload that was changed after signing", () => {
    expect(verifyStripeSignature(payload + " ", sign(payload, now), secret, now)).toBe(false);
  });

  it("rejects a signature made with a different secret", () => {
    expect(verifyStripeSignature(payload, sign(payload, now, "whsec_other"), secret, now)).toBe(false);
  });

  it("rejects an old signature, to stop replays", () => {
    expect(verifyStripeSignature(payload, sign(payload, now - 301), secret, now)).toBe(false);
  });

  it("rejects a missing header or secret", () => {
    expect(verifyStripeSignature(payload, null, secret, now)).toBe(false);
    expect(verifyStripeSignature(payload, sign(payload, now), "", now)).toBe(false);
  });
});

describe("testSecretKey", () => {
  it("accepts only test-mode secret keys", () => {
    expect(testSecretKey("sk_test_abc")).toBe("sk_test_abc");
    expect(testSecretKey("sk_live_abc")).toBeNull();
    expect(testSecretKey("rk_test_abc")).toBeNull();
    expect(testSecretKey(undefined)).toBeNull();
  });
});

describe("paymentMatches", () => {
  it("accepts the exact amount in pounds", () => {
    expect(paymentMatches({ amount_total: 90000, currency: "gbp" }, 90000)).toBe(true);
    expect(paymentMatches({ amount_total: 90000, currency: "GBP" }, 90000)).toBe(true);
  });

  it("refuses a different amount, a different currency or a missing total", () => {
    expect(paymentMatches({ amount_total: 100, currency: "gbp" }, 90000)).toBe(false);
    expect(paymentMatches({ amount_total: 90000, currency: "usd" }, 90000)).toBe(false);
    expect(paymentMatches({ amount_total: null, currency: "gbp" }, 90000)).toBe(false);
    expect(paymentMatches({}, 90000)).toBe(false);
  });

  it("refuses a zero or invalid amount on record", () => {
    expect(paymentMatches({ amount_total: 0, currency: "gbp" }, 0)).toBe(false);
    expect(paymentMatches({ amount_total: 1.5, currency: "gbp" }, 1.5)).toBe(false);
  });
});

describe("stripeSecretKey", () => {
  it("accepts only a test key unless live mode is switched on", () => {
    expect(stripeSecretKey("sk_test_abc", undefined)).toBe("sk_test_abc");
    expect(stripeSecretKey("sk_live_abc", undefined)).toBeNull();
    expect(stripeSecretKey("sk_live_abc", "test")).toBeNull();
  });

  it("in live mode accepts only live secret or restricted keys, never a test key", () => {
    expect(stripeSecretKey("sk_live_abc", "live")).toBe("sk_live_abc");
    expect(stripeSecretKey("rk_live_abc", " LIVE ")).toBe("rk_live_abc");
    expect(stripeSecretKey("sk_test_abc", "live")).toBeNull();
  });

  it("refuses an empty key", () => {
    expect(stripeSecretKey("", "live")).toBeNull();
    expect(stripeSecretKey(undefined, undefined)).toBeNull();
  });
});
