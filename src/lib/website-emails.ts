/**
 * Emails for website quotes. Plain text, so nothing a visitor typed is ever rendered as HTML. Each one states the
 * first payment and the ongoing payment separately, and says that the final price is confirmed in writing.
 */
import { LEGAL_REVIEW_PENDING, OWNERSHIP, formatGBP, formatPence } from "./pricing";
import type { Intent, WebsiteDetails } from "./website-enquiry";
import type { WebsiteQuote } from "./website-quote";

const first = (name: string) => name.trim().split(/\s+/)[0] || "there";

function paymentLines(quote: WebsiteQuote): string[] {
  if (quote.mode === "monthly") {
    return [
      `Package: ${quote.packageName}`,
      `Initial payment: ${formatGBP(quote.initialPayment)} (setup ${formatGBP(quote.setup)} plus your first month${quote.oneOffTotal ? " and one-off extras" : ""})`,
      `Then: ${formatGBP(quote.monthly)} a month`,
      `Minimum term: ${OWNERSHIP.minimumTermMonths} months. After ${OWNERSHIP.ownershipAfterPayments} successful payments, ownership of your agreed website transfers to you.`,
    ];
  }
  return [
    `Package: ${quote.packageName}`,
    `Project price: ${quote.hasFromPrices ? "from " : ""}${formatGBP(quote.oneOffTotal)}`,
    quote.monthly ? `Optional ongoing: ${formatGBP(quote.monthly)} a month` : "Optional ongoing: none chosen",
  ];
}

export function customerAcknowledgement(args: {
  reference: string;
  details: WebsiteDetails;
  quote: WebsiteQuote;
  intent: Intent;
  siteUrl: string;
}): { subject: string; text: string } {
  const { reference, details, quote, intent, siteUrl } = args;
  const next =
    intent === "callback"
      ? `We'll call you on ${details.phone} within one working day to talk it through.`
      : "We'll review your answers and reply within one working day with a written proposal.";
  const text = [
    `Hi ${first(details.name)},`,
    "",
    `Thank you for building your website with us. Here's your estimate. Your reference is ${reference}.`,
    "",
    "YOUR ESTIMATE",
    ...paymentLines(quote),
    ...(quote.requiresQuote ? ["", "Some parts need a custom quote:", ...quote.quoteReasons.map((r) => `- ${r}`)] : []),
    ...(quote.thirdParty.length ? ["", "Third-party fees (paid to the provider):", ...quote.thirdParty.map((r) => `- ${r}`)] : []),
    "",
    "WHAT HAPPENS NEXT",
    next,
    "Nothing is charged until you have seen and accepted your written proposal.",
    "",
    "This is an estimate. Final pricing is confirmed in a written proposal.",
    ...(LEGAL_REVIEW_PENDING && quote.mode === "monthly"
      ? ["Ownership, cancellation and transfer terms are confirmed in your written agreement."]
      : []),
    "",
    `See our packages: ${siteUrl.replace(/\/+$/, "")}/pricing`,
    "",
    "WINJO DIGITAL",
  ].join("\n");
  return { subject: `Your website estimate is here [${reference}]`, text };
}

export function ownerSubject(details: WebsiteDetails, quote: WebsiteQuote, intent: Intent, reference: string): string {
  const what =
    quote.mode === "monthly"
      ? `${quote.packageName} ${formatGBP(quote.monthly)}/month`
      : `One-off ${quote.hasFromPrices ? "from " : ""}${formatGBP(quote.oneOffTotal)}`;
  const kind = intent === "callback" ? "Callback request" : intent === "pay" ? "Website order (paying now)" : "Website quote";
  return `${kind} from ${details.businessName || details.name}: ${what} [${reference}]`.replace(/\s+/g, " ").slice(0, 200);
}

/* ------------------------------------------------------------------ */
/* Subscription lifecycle (Stage 6)                                    */
/* ------------------------------------------------------------------ */

export type SubscriptionEmailFacts = {
  reference: string;
  name: string;
  packageName: string;
  kind: "subscription" | "one_off";
  setupPence: number;
  monthlyPence: number;
  oneOffPence: number;
  paymentsCount?: number;
  ownershipAfterPayments: number;
  minimumTermMonths: number;
};

const gbpPence = (p: number) => formatPence(p);
const sign = ["", "WINJO DIGITAL"];

/**
 * Sent when a customer starts paying straight from their quote, so the link is in their inbox if they close the
 * Stripe page before finishing. If they pay straight away they also get the welcome or receipt email, which says so.
 */
export function payLinkEmail(f: SubscriptionEmailFacts, link: string): { subject: string; text: string } {
  const lines =
    f.kind === "subscription"
      ? [
          `Package: ${f.packageName}`,
          `First payment: ${gbpPence(f.setupPence + f.oneOffPence + f.monthlyPence)} (setup${f.oneOffPence ? ", one-off extras" : ""} and your first month)`,
          `Then: ${gbpPence(f.monthlyPence)} a month, ${f.minimumTermMonths}-month minimum term`,
        ]
      : [`${f.packageName}`, `Deposit: ${gbpPence(f.oneOffPence)}`];
  return {
    subject: `Your website is waiting [${f.reference}]`,
    text: [
      `Hi ${first(f.name)},`,
      "",
      "Thanks for building your website with us. If you didn't finish, this link picks up where you left off:",
      link,
      "",
      ...lines,
      "",
      "If you have already paid, you don't need to do anything: we'll be in touch within one working day to start your website.",
      "The link works for 30 days. Please don't share it.",
      ...sign,
    ].join("\n"),
  };
}

/** The private payment link, sent once the written proposal is agreed. */
export function offerEmail(f: SubscriptionEmailFacts, link: string): { subject: string; text: string } {
  const lines =
    f.kind === "subscription"
      ? [
          `Package: ${f.packageName}`,
          `First payment: ${gbpPence(f.setupPence + f.oneOffPence + f.monthlyPence)} (setup${f.oneOffPence ? ", one-off extras" : ""} and your first month)`,
          `Then: ${gbpPence(f.monthlyPence)} a month, ${f.minimumTermMonths}-month minimum term`,
          `Ownership of your agreed website transfers to you after ${f.ownershipAfterPayments} successful monthly payments.`,
        ]
      : [`${f.packageName}`, `Amount due now: ${gbpPence(f.oneOffPence)}`];
  return {
    subject: `Your secure payment link [${f.reference}]`,
    text: [
      `Hi ${first(f.name)},`,
      "",
      "Thank you. Here's your private link to review the terms and make your first payment:",
      link,
      "",
      ...lines,
      "",
      "The link works for 30 days. Please don't share it.",
      ...sign,
    ].join("\n"),
  };
}

export function welcomeEmail(f: SubscriptionEmailFacts): { subject: string; text: string } {
  return {
    subject: `Welcome to WINJO DIGITAL [${f.reference}]`,
    text: [
      `Hi ${first(f.name)},`,
      "",
      `Your ${f.packageName} website package is set up and your first payment has been received. Thank you.`,
      "",
      `Monthly payment: ${gbpPence(f.monthlyPence)}, taken automatically each month.`,
      `Minimum term: ${f.minimumTermMonths} months.`,
      "",
      "What happens next: we'll be in touch within one working day to start your website. Stripe emails a receipt for every payment.",
      "",
      "Your agreement",
      `Ownership: after ${f.ownershipAfterPayments} successful monthly payments, ownership of your agreed website deliverables transfers to you.`,
      ...sign,
    ].join("\n"),
  };
}

export function paymentReceivedEmail(f: SubscriptionEmailFacts, amountPence: number): { subject: string; text: string } {
  const count = f.paymentsCount ?? 0;
  const left = Math.max(0, f.ownershipAfterPayments - count);
  return {
    subject: `Payment received: ${count} of ${f.ownershipAfterPayments} [${f.reference}]`,
    text: [
      `Hi ${first(f.name)},`,
      "",
      `We've received your ${gbpPence(amountPence)} payment. That's ${count} of ${f.ownershipAfterPayments}.`,
      left > 0 ? "" : "That's the last one for your agreement. Thank you for being with us.",
      ...sign,
    ].join("\n"),
  };
}

export function paymentFailedEmail(f: SubscriptionEmailFacts, manageLink: string | null): { subject: string; text: string } {
  return {
    subject: `Your payment needs a quick look [${f.reference}]`,
    text: [
      `Hi ${first(f.name)},`,
      "",
      `We couldn't take this month's ${gbpPence(f.monthlyPence)}. No action is needed yet: Stripe will try again over the next few days.`,
      manageLink ? `To update your card now, use your billing link: ${manageLink}` : "Reply to this email and we'll help you update your card.",
      "Your website stays live while this is sorted.",
      ...sign,
    ].join("\n"),
  };
}

export function ownershipEmail(f: SubscriptionEmailFacts): { subject: string; text: string } {
  return {
    subject: `Your website is now yours [${f.reference}]`,
    text: [
      `Hi ${first(f.name)},`,
      "",
      `Thank you for ${f.ownershipAfterPayments} successful payments. Ownership of your agreed website deliverables now transfers to you, as set out in your agreement.`,
      "",
      "Your subscription carries on month to month, with hosting, maintenance and support as before. If you'd like us to transfer the website to you instead, reply to this email and we'll explain the transfer policy.",
      ...sign,
    ].join("\n"),
  };
}

export function cancelledEmail(f: SubscriptionEmailFacts): { subject: string; text: string } {
  return {
    subject: `We're sorry to see you go [${f.reference}]`,
    text: [
      `Hi ${first(f.name)},`,
      "",
      `Your ${f.packageName} subscription has ended. No further payments will be taken.`,
      "If this isn't what you expected, reply to this email and we'll look into it straight away.",
      ...sign,
    ].join("\n"),
  };
}

export function oneOffPaidEmail(f: SubscriptionEmailFacts): { subject: string; text: string } {
  return {
    subject: `Payment received [${f.reference}]`,
    text: [
      `Hi ${first(f.name)},`,
      "",
      `Your payment of ${gbpPence(f.oneOffPence)} has arrived. We'll be in touch within one working day to begin.`,
      "Stripe emails you a receipt for the payment.",
      ...sign,
    ].join("\n"),
  };
}
