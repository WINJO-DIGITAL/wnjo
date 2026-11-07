import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Minimal Stripe support, server-side only. Test mode only: a live-mode key is refused until the owner
 * approves going live. Calls use Stripe's HTTP API directly, so there is no extra dependency to keep updated.
 */

export const STRIPE_API = "https://api.stripe.com/v1";

/** Returns the key only if it is a test-mode secret key. Anything else is refused. */
export function testSecretKey(raw: string | undefined): string | null {
  const key = raw?.trim();
  if (!key || !key.startsWith("sk_test_")) return null;
  return key;
}

/**
 * True only when a completed Checkout Session charged exactly the amount we asked for, in pounds. A signed event
 * proves Stripe sent it; this proves it is for the payment on record, so a mismatch is never marked paid.
 */
export function paymentMatches(
  session: { amount_total?: number | null; currency?: string | null },
  expectedPence: number,
): boolean {
  return (
    Number.isInteger(expectedPence) &&
    expectedPence > 0 &&
    session.amount_total === expectedPence &&
    (session.currency ?? "").toLowerCase() === "gbp"
  );
}

/**
 * Checks a webhook's Stripe-Signature header: HMAC-SHA256 of "timestamp.payload" with the endpoint secret,
 * compared in constant time, and rejected if the timestamp is more than five minutes old.
 */
export function verifyStripeSignature(
  payload: string,
  header: string | null,
  secret: string,
  nowSeconds: number,
  toleranceSeconds = 300,
): boolean {
  if (!header || !secret) return false;
  const pairs = header.split(",").map((part) => part.trim().split("=", 2));
  const timestamp = pairs.find(([k]) => k === "t")?.[1];
  const signatures = pairs.filter(([k]) => k === "v1").map(([, v]) => v ?? "");
  if (!timestamp || signatures.length === 0) return false;
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(nowSeconds - ts) > toleranceSeconds) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
  return signatures.some((sig) => {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  });
}

/** Creates a one-off Checkout Session for a deposit, in pence and GBP. Returns the session id and its page. */
export async function createDepositCheckout(args: {
  secretKey: string;
  depositId: string;
  amountPence: number;
  customerEmail: string;
  description: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ id: string; url: string }> {
  const body = new URLSearchParams({
    mode: "payment",
    customer_email: args.customerEmail,
    client_reference_id: args.depositId,
    "metadata[deposit_id]": args.depositId,
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": "gbp",
    "line_items[0][price_data][unit_amount]": String(args.amountPence),
    "line_items[0][price_data][product_data][name]": args.description,
    success_url: args.successUrl,
    cancel_url: args.cancelUrl,
  });
  const res = await fetch(`${STRIPE_API}/checkout/sessions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${args.secretKey}`, "Content-Type": "application/x-www-form-urlencoded" },
    body,
    signal: AbortSignal.timeout(15_000),
  });
  const json = (await res.json().catch(() => null)) as { id?: string; url?: string } | null;
  if (!res.ok || !json?.id || !json.url) {
    throw new Error(`Stripe checkout failed with status ${res.status}`);
  }
  return { id: json.id, url: json.url };
}
