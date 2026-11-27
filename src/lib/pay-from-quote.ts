import type { SupabaseClient } from "@supabase/supabase-js";
import type { Route } from "./build-journey";
import { markAwaitingPayment } from "./brief-payment";
import { stripeConfig } from "./stripe";
import { createOffer, type CreatedOffer } from "./website-offers";
import type { WebsiteAnswers, WebsiteQuote } from "./website-quote";
import { checkoutParams, createOfferCheckout, payNowFor } from "./website-subscriptions";
import { BLACK_FRIDAY } from "./black-friday";

/**
 * Starts a payment straight from a customer's quote: the offer row holds the amounts (worked out here from the
 * answers, never taken from the browser), Stripe Checkout is created from that row, and the build shows "Payment" on
 * the customer's timeline. Returns null when there is nothing to pay yet (a bespoke build needs a proposal first) or
 * the offer couldn't be saved. If only Stripe fails, the offer still exists, so the customer can be emailed its link.
 */
export async function startQuotePayment(
  db: SupabaseClient,
  args: {
    origin: string;
    tenantId: string;
    reference: string;
    route: Route;
    email: string;
    name: string;
    businessName: string | null;
    answers: WebsiteAnswers;
    quote: WebsiteQuote;
    /** The customer asked us to start work within the 14-day cancellation period. */
    startNow?: boolean;
    /**
     * The Black Friday free first month. The caller has already checked, on the server's clock, that the offer is on
     * and the plan qualifies; here it is recorded with the offer and passed to Stripe as a 30-day trial.
     */
    blackFriday?: boolean;
  },
): Promise<{ url: string | null; offer: CreatedOffer } | null> {
  if (!payNowFor(args.route, args.quote)) return null;
  const offer = await createOffer(db, {
    tenantId: args.tenantId,
    enquiryReference: args.reference,
    email: args.email,
    name: args.name,
    businessName: args.businessName,
    answers: args.answers,
    quote: args.quote,
    overrides: {},
    createdBy: null,
    consent: { agreedAt: new Date().toISOString(), startNow: args.startNow === true },
    ...(args.blackFriday
      ? {
          blackFriday: {
            code: BLACK_FRIDAY.code,
            trialDays: BLACK_FRIDAY.trialDays,
            minimumTermMonths: BLACK_FRIDAY.minimumTermMonths,
            agreedAt: new Date().toISOString(),
          },
        }
      : {}),
  });
  if (!offer) return null;

  const key = stripeConfig().secretKey;
  if (!key) return { url: null, offer };
  try {
    const session = await createOfferCheckout(
      key,
      checkoutParams(
        { id: offer.id, reference: offer.reference, email: args.email, ...offer.amounts },
        {
          success: `${args.origin}/subscribe/done?session_id={CHECKOUT_SESSION_ID}`,
          cancel: `${args.origin}/subscribe/${offer.token}?cancelled=1`,
        },
        {},
        args.blackFriday ? { days: BLACK_FRIDAY.trialDays, offerCode: BLACK_FRIDAY.code } : undefined,
      ),
    );
    await markAwaitingPayment(db, args.tenantId, args.reference);
    return { url: session.url, offer };
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Stripe checkout failed");
    return { url: null, offer };
  }
}
