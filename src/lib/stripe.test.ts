import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { testSecretKey, verifyStripeSignature } from "@/lib/stripe";

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
