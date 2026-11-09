import { createHash, randomBytes } from "node:crypto";
import { OWNERSHIP } from "./pricing";
import { STRIPE_API } from "./stripe";
import type { WebsiteAnswers, WebsiteQuote } from "./website-quote";

/**
 * Website subscriptions and one-off website payments (Stage 6). Pure helpers first (tested without Stripe or a
 * database), then the small set of Stripe calls, which use the HTTP API directly like lib/stripe.ts.
 *
 * - A subscription's first payment is the setup fee plus any one-off extras plus the first month, collected together
 *   by Stripe Checkout; then the monthly price each month.
 * - A one-off website takes a single payment of the amount on the offer (by default the 50% deposit in the terms).
 * - Nothing is charged twice: Checkout is created from the amounts on the offer row, and each paid invoice is recorded
 *   once (website_subscription_payments.stripe_reference is unique).
 */

export const OFFER_TTL_DAYS = 30;

export function newSubscriptionReference(): string {
  return `WS-${randomBytes(3).toString("hex").toUpperCase()}`;
}

/** A private link token. Only its SHA-256 hash is stored, so a database read never reveals a working link. */
export function newOfferToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashOfferToken(token) };
}

export function hashOfferToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export const OFFER_TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;

export type OfferAmounts = {
  kind: "subscription" | "one_off";
  packageCode: "bronze" | "silver" | "gold" | "one_off";
  packageName: string;
  setupPence: number;
  monthlyPence: number;
  /** Subscription: one-off extras paid with the first month. One-off website: the single amount due. */
  oneOffPence: number;
};

/** Staff can adjust the figures to match the written proposal. All in pounds; blank keeps the calculator's figure. */
export type OfferOverrides = { setup?: number; monthly?: number; oneOff?: number };

const pence = (pounds: number) => Math.round(pounds * 100);
const validPounds = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 100_000;

/** The deposit share for a one-off website, from the terms ("Deposits and balances"). */
export const ONE_OFF_DEPOSIT_SHARE = 0.5;

export function offerFromQuote(answers: WebsiteAnswers, quote: WebsiteQuote, overrides: OfferOverrides = {}): OfferAmounts {
  if (quote.mode === "monthly") {
    return {
      kind: "subscription",
      packageCode: answers.plan,
      packageName: quote.packageName,
      setupPence: pence(validPounds(overrides.setup) ? overrides.setup : quote.setup),
      monthlyPence: pence(validPounds(overrides.monthly) ? overrides.monthly : quote.monthly),
      oneOffPence: pence(validPounds(overrides.oneOff) ? overrides.oneOff : quote.oneOffTotal),
    };
  }
  return {
    kind: "one_off",
    packageCode: "one_off",
    packageName: quote.packageName,
    setupPence: 0,
    monthlyPence: 0,
    oneOffPence: pence(validPounds(overrides.oneOff) ? overrides.oneOff : quote.oneOffTotal * ONE_OFF_DEPOSIT_SHARE),
  };
}

/**
 * The offer figures for an accepted bespoke proposal, in pounds. A monthly proposal keeps its setup, monthly and
 * one-off amounts; a one-off proposal takes the deposit share of its total now, as the terms set out.
 */
export function proposalOverrides(
  mode: "monthly" | "oneOff",
  agreed: { setup_pence: number; monthly_pence: number; one_off_pence: number },
): OfferOverrides {
  if (mode === "monthly") {
    return { setup: agreed.setup_pence / 100, monthly: agreed.monthly_pence / 100, oneOff: agreed.one_off_pence / 100 };
  }
  return { oneOff: Math.round(agreed.one_off_pence * ONE_OFF_DEPOSIT_SHARE) / 100 };
}

/** What the customer pays first: setup + one-off extras + the first month, or the one-off amount. */
export function firstPaymentPence(offer: Pick<OfferAmounts, "kind" | "setupPence" | "monthlyPence" | "oneOffPence">): number {
  return offer.kind === "subscription" ? offer.setupPence + offer.oneOffPence + offer.monthlyPence : offer.oneOffPence;
}

/** The Stripe Checkout request for an offer. Amounts come only from the offer row, never from the browser. */
export function checkoutParams(
  offer: OfferAmounts & { id: string; reference: string; email: string },
  urls: { success: string; cancel: string },
): URLSearchParams {
  const p = new URLSearchParams({
    customer_email: offer.email,
    client_reference_id: offer.id,
    "metadata[website_subscription_id]": offer.id,
    "metadata[reference]": offer.reference,
    success_url: urls.success,
    cancel_url: urls.cancel,
    locale: "en-GB",
  });
  if (offer.kind === "subscription") {
    p.set("mode", "subscription");
    p.set("line_items[0][quantity]", "1");
    p.set("line_items[0][price_data][currency]", "gbp");
    p.set("line_items[0][price_data][unit_amount]", String(offer.monthlyPence));
    p.set("line_items[0][price_data][recurring][interval]", "month");
    p.set("line_items[0][price_data][product_data][name]", `${offer.packageName} website package`);
    const upfront = offer.setupPence + offer.oneOffPence;
    if (upfront > 0) {
      // A one-time price in subscription mode is charged once, on the first invoice, with the first month.
      p.set("line_items[1][quantity]", "1");
      p.set("line_items[1][price_data][currency]", "gbp");
      p.set("line_items[1][price_data][unit_amount]", String(upfront));
      p.set(
        "line_items[1][price_data][product_data][name]",
        offer.oneOffPence > 0 ? "Setup fee and one-off extras" : "Setup fee",
      );
    }
    p.set("subscription_data[metadata][website_subscription_id]", offer.id);
    p.set("subscription_data[metadata][reference]", offer.reference);
    p.set("subscription_data[description]", `${offer.packageName} website package (${offer.reference})`);
  } else {
    p.set("mode", "payment");
    p.set("line_items[0][quantity]", "1");
    p.set("line_items[0][price_data][currency]", "gbp");
    p.set("line_items[0][price_data][unit_amount]", String(offer.oneOffPence));
    p.set("line_items[0][price_data][product_data][name]", `${offer.packageName} (${offer.reference})`);
    p.set("payment_intent_data[metadata][website_subscription_id]", offer.id);
  }
  return p;
}

export type SubscriptionStatus = "offered" | "active" | "past_due" | "cancelled" | "paid" | "expired";

/** Maps Stripe's subscription status onto ours. Unknown states leave ours unchanged (null). */
export function statusFromStripe(stripeStatus: string | undefined): SubscriptionStatus | null {
  switch (stripeStatus) {
    case "active":
    case "trialing":
      return "active";
    case "past_due":
    case "unpaid":
      return "past_due";
    case "canceled":
    case "incomplete_expired":
      return "cancelled";
    default:
      return null;
  }
}

/** The moment ownership becomes due: the paid date of the qualifying payment, once enough have been made. */
export function ownershipDue(paidDates: string[], threshold: number = OWNERSHIP.ownershipAfterPayments): string | null {
  if (paidDates.length < threshold) return null;
  return [...paidDates].sort()[threshold - 1] ?? null;
}

export { monthlyRecurringPence } from "./website-subscription-figures";

/* ------------------------------------------------------------------ */
/* Stripe calls                                                        */
/* ------------------------------------------------------------------ */

async function stripePost<T>(secretKey: string, path: string, body: URLSearchParams): Promise<T> {
  const res = await fetch(`${STRIPE_API}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${secretKey}`, "Content-Type": "application/x-www-form-urlencoded" },
    body,
    signal: AbortSignal.timeout(15_000),
  });
  const json = (await res.json().catch(() => null)) as T | null;
  if (!res.ok || !json) throw new Error(`Stripe ${path} failed with status ${res.status}`);
  return json;
}

async function stripeGet<T>(secretKey: string, path: string): Promise<T> {
  const res = await fetch(`${STRIPE_API}${path}`, {
    headers: { Authorization: `Bearer ${secretKey}` },
    signal: AbortSignal.timeout(15_000),
  });
  const json = (await res.json().catch(() => null)) as T | null;
  if (!res.ok || !json) throw new Error(`Stripe ${path} failed with status ${res.status}`);
  return json;
}

export async function createOfferCheckout(
  secretKey: string,
  params: URLSearchParams,
): Promise<{ id: string; url: string; livemode: boolean }> {
  const s = await stripePost<{ id?: string; url?: string; livemode?: boolean }>(secretKey, "/checkout/sessions", params);
  if (!s.id || !s.url) throw new Error("Stripe checkout returned no page");
  return { id: s.id, url: s.url, livemode: Boolean(s.livemode) };
}

/** Reads a Checkout Session back from Stripe, so a "thank you" page only claims what Stripe confirms. */
export async function readCheckout(
  secretKey: string,
  sessionId: string,
): Promise<{ status: string; paymentStatus: string; clientReferenceId: string | null }> {
  const s = await stripeGet<{ status?: string; payment_status?: string; client_reference_id?: string | null }>(
    secretKey,
    `/checkout/sessions/${encodeURIComponent(sessionId)}`,
  );
  return { status: s.status ?? "", paymentStatus: s.payment_status ?? "", clientReferenceId: s.client_reference_id ?? null };
}

/**
 * A billing-portal session, so a customer can update their card and see invoices and receipts. Cancellation and plan
 * changes are not offered there: the minimum term and ownership are handled under the written agreement.
 */
export async function createPortalSession(
  secretKey: string,
  customerId: string,
  returnUrl: string,
  configurationId?: string,
): Promise<string> {
  const p = new URLSearchParams({ customer: customerId, return_url: returnUrl });
  if (configurationId) p.set("configuration", configurationId);
  const s = await stripePost<{ url?: string }>(secretKey, "/billing_portal/sessions", p);
  if (!s.url) throw new Error("Stripe portal returned no page");
  return s.url;
}

/**
 * Changes a subscription's monthly price (an upgrade or downgrade agreed with the customer), from the next invoice,
 * with no proration. Stripe needs the existing product for an inline price, so the recurring item is read first.
 */
export async function changeMonthlyPrice(secretKey: string, subscriptionId: string, monthlyPence: number): Promise<void> {
  const sub = await stripeGet<{
    items?: { data?: { id: string; price?: { product?: string; recurring?: unknown } }[] };
  }>(secretKey, `/subscriptions/${encodeURIComponent(subscriptionId)}`);
  const item = sub.items?.data?.find((i) => i.price?.recurring);
  if (!item?.price?.product) throw new Error("Subscription has no recurring item");
  const p = new URLSearchParams({
    "items[0][id]": item.id,
    "items[0][price_data][currency]": "gbp",
    "items[0][price_data][unit_amount]": String(monthlyPence),
    "items[0][price_data][recurring][interval]": "month",
    "items[0][price_data][product]": item.price.product,
    proration_behavior: "none",
  });
  await stripePost(secretKey, `/subscriptions/${encodeURIComponent(subscriptionId)}`, p);
}
