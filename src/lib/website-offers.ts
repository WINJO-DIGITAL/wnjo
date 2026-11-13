import type { SupabaseClient } from "@supabase/supabase-js";
import { HOSTING_CODE, HOSTING_NAME, type HostingPlan, type WebsiteStatus } from "./hosting-request";
import { CARE_PLANS, OWNERSHIP } from "./pricing";
import { QUOTE_TERMS_VERSION } from "./terms";
import type { WebsiteAnswers, WebsiteQuote } from "./website-quote";
import {
  OFFER_TTL_DAYS,
  newOfferToken,
  newSubscriptionReference,
  offerFromQuote,
  type OfferAmounts,
  type OfferOverrides,
} from "./website-subscriptions";

/**
 * Creates the payment offer behind a Stripe Checkout: the row that holds the amounts, so nothing in a request can
 * change what is charged. Used by staff (a payment link after a proposal), by a customer paying straight from their
 * quote, and by a customer paying the deposit on an accepted proposal.
 */

export type NewOffer = {
  tenantId: string;
  /** The brief's reference (the enquiry it came from). */
  enquiryReference: string;
  email: string;
  name: string;
  businessName: string | null;
  answers: WebsiteAnswers;
  quote: WebsiteQuote;
  overrides: OfferOverrides;
  /** The staff member who made it, or null when the customer did. */
  createdBy: string | null;
  /** Names the offer on the receipt and in Stripe when it is not a package, such as the final payment on a one-off website. */
  packageName?: string;
  /** Recorded in the snapshot when the customer agreed to the terms before paying. */
  consent?: { agreedAt: string; startNow?: boolean };
};

export type CreatedOffer = { id: string; reference: string; token: string; amounts: OfferAmounts };

export async function createOffer(db: SupabaseClient, input: NewOffer): Promise<CreatedOffer | null> {
  const amounts = offerFromQuote(input.answers, input.quote, input.overrides);
  const { token, hash } = newOfferToken();
  const reference = newSubscriptionReference();
  const { data, error } = await db
    .from("website_subscriptions")
    .insert({
      tenant_id: input.tenantId,
      reference,
      kind: amounts.kind,
      email: input.email,
      name: input.name,
      business_name: input.businessName,
      enquiry_reference: input.enquiryReference,
      package_code: amounts.packageCode,
      package_name: input.packageName ?? amounts.packageName,
      setup_pence: amounts.setupPence,
      monthly_pence: amounts.monthlyPence,
      one_off_pence: amounts.oneOffPence,
      quote_snapshot: {
        answers: input.answers,
        lines: input.quote.lines,
        overrides: input.overrides,
        ...(input.consent ? { consent: { ...input.consent, termsVersion: QUOTE_TERMS_VERSION } } : {}),
      },
      terms_version: QUOTE_TERMS_VERSION,
      minimum_term_months: OWNERSHIP.minimumTermMonths,
      ownership_after_payments: OWNERSHIP.ownershipAfterPayments,
      offer_token_hash: hash,
      offer_expires_at: new Date(Date.now() + OFFER_TTL_DAYS * 86_400_000).toISOString(),
      created_by: input.createdBy,
    })
    .select("id, reference")
    .single();
  if (error || !data) {
    console.error(`Could not create website subscription offer: ${error?.code ?? "unknown"}`);
    return null;
  }
  return { id: (data as { id: string }).id, reference, token, amounts: input.packageName ? { ...amounts, packageName: input.packageName } : amounts };
}

/** The amounts for a hosting plan, from the one price list. Nothing in a request can change them. */
export function hostingOfferAmounts(plan: HostingPlan): OfferAmounts {
  return {
    kind: "subscription",
    packageCode: HOSTING_CODE[plan],
    packageName: HOSTING_NAME[plan],
    setupPence: 0,
    monthlyPence: Math.round(CARE_PLANS[plan].monthly * 100),
    oneOffPence: 0,
  };
}

export type NewHostingOffer = {
  tenantId: string;
  /** The hosting request's reference (the enquiry it came from). */
  enquiryReference: string;
  email: string;
  name: string;
  businessName: string | null;
  plan: HostingPlan;
  status: WebsiteStatus;
  /** The website address the hosting is for, when they have one. */
  siteUrl: string;
  consent: { agreedAt: string };
};

/**
 * The payment offer behind a hosting-only checkout. Hosting is rolling monthly with no website to hand over, so there is
 * no minimum term and no ownership milestone (both 0). The customer's own choices are kept in the snapshot for staff.
 */
export async function createHostingOffer(db: SupabaseClient, input: NewHostingOffer): Promise<CreatedOffer | null> {
  const amounts = hostingOfferAmounts(input.plan);
  const { token, hash } = newOfferToken();
  const reference = newSubscriptionReference();
  const { data, error } = await db
    .from("website_subscriptions")
    .insert({
      tenant_id: input.tenantId,
      reference,
      kind: amounts.kind,
      email: input.email,
      name: input.name,
      business_name: input.businessName,
      enquiry_reference: input.enquiryReference,
      package_code: amounts.packageCode,
      package_name: amounts.packageName,
      setup_pence: amounts.setupPence,
      monthly_pence: amounts.monthlyPence,
      one_off_pence: amounts.oneOffPence,
      quote_snapshot: {
        hosting: { plan: input.plan, websiteStatus: input.status, siteUrl: input.siteUrl },
        consent: { ...input.consent, termsVersion: QUOTE_TERMS_VERSION },
      },
      terms_version: QUOTE_TERMS_VERSION,
      minimum_term_months: 0,
      ownership_after_payments: 0,
      offer_token_hash: hash,
      offer_expires_at: new Date(Date.now() + OFFER_TTL_DAYS * 86_400_000).toISOString(),
      created_by: null,
    })
    .select("id, reference")
    .single();
  if (error || !data) {
    console.error(`Could not create hosting offer: ${error?.code ?? "unknown"}`);
    return null;
  }
  return { id: (data as { id: string }).id, reference, token, amounts };
}
