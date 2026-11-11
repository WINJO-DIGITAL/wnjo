/**
 * Emails for website quotes. Plain text, so nothing a visitor typed is ever rendered as HTML. Each one states the
 * first payment and the ongoing payment separately, and says that the final price is confirmed in writing.
 */
import { LEGAL_REVIEW_PENDING, OWNERSHIP, formatGBP, formatPence } from "./pricing";
import { UNNAMED, type Intent, type WebsiteDetails } from "./website-enquiry";
import type { WebsiteQuote } from "./website-quote";

const first = (name: string) => (name === UNNAMED ? "" : name.trim().split(/\s+/)[0]) || "there";

/** What the first payment is made of, in words: "your first month", or "setup, one-off extras and your first month". */
export function firstPaymentParts(hasSetup: boolean, hasOneOff: boolean): string {
  const parts = [...(hasSetup ? ["setup"] : []), ...(hasOneOff ? ["one-off extras"] : [])];
  return parts.length ? `${parts.join(", ")} and your first month` : "your first month";
}

/** The term in one line. Subscriptions agreed with a minimum term keep it; new ones are rolling monthly. */
export function termLine(minimumTermMonths: number): string {
  return minimumTermMonths > 0 ? `Minimum term: ${minimumTermMonths} months.` : "Rolling monthly, with no minimum term.";
}
const termSuffix = (minimumTermMonths: number) =>
  minimumTermMonths > 0 ? `${minimumTermMonths}-month minimum term` : "rolling monthly, no minimum term";

function paymentLines(quote: WebsiteQuote): string[] {
  if (quote.mode === "monthly") {
    return [
      `Package: ${quote.packageName}`,
      `First payment: ${formatGBP(quote.initialPayment)} (${firstPaymentParts(quote.setup > 0, quote.oneOffTotal > 0)})`,
      `Then: ${formatGBP(quote.monthly)} a month`,
      termLine(OWNERSHIP.minimumTermMonths),
      ...(OWNERSHIP.ownershipAfterPayments > 0
        ? [`After ${OWNERSHIP.ownershipAfterPayments} successful payments, ownership of your agreed website transfers to you.`]
        : []),
    ];
  }
  return [
    `Package: ${quote.packageName}`,
    `Project price: ${quote.hasFromPrices ? "from " : ""}${formatGBP(quote.oneOffTotal)}`,
    quote.monthly ? `Optional ongoing: ${formatGBP(quote.monthly)} a month` : "Optional ongoing: none chosen",
  ];
}

/**
 * The acknowledgement for a buy-outright request. There is no price yet: staff write a proposal, and the deposit is
 * taken only after it is accepted. Quoting "from £999" here would read as an estimate, so it doesn't.
 */
export function projectAcknowledgement(args: { reference: string; details: WebsiteDetails; siteUrl: string }): { subject: string; text: string } {
  const { reference, details, siteUrl } = args;
  const text = [
    `Hi ${first(details.name)},`,
    "",
    `Thank you for asking us to build your website. Your reference is ${reference}.`,
    "",
    "WHAT HAPPENS NEXT",
    "We'll review what you've told us and reply within one working day with a written proposal and a fixed price.",
    "Nothing is charged until you have read and accepted that proposal.",
    "When you accept, the first payment is a 50% deposit. The rest is due as set out in the proposal.",
    "",
    `Questions? Reply to this email, or see ${siteUrl.replace(/\/+$/, "")}/website-projects`,
    "",
    "WINJO DIGITAL",
  ].join("\n");
  return { subject: `Your website project request [${reference}]`, text };
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
    `Thank you for getting started with us. Here's your estimate. Your reference is ${reference}.`,
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
  return `${kind} from ${details.businessName || (details.name === UNNAMED ? details.email : details.name)}: ${what} [${reference}]`.replace(/\s+/g, " ").slice(0, 200);
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
 * Sent only when the customer asked to pay straight from their quote but Stripe's page could not be opened, so the
 * link reaches them by email instead. It is not sent to anyone who was taken to Stripe: they are paying right now,
 * and "if you didn't finish" would be wrong for them. They get the welcome or receipt email after paying.
 */
export function payLinkEmail(f: SubscriptionEmailFacts, link: string): { subject: string; text: string } {
  const lines =
    f.kind === "subscription"
      ? [
          `Package: ${f.packageName}`,
          `First payment: ${gbpPence(f.setupPence + f.oneOffPence + f.monthlyPence)} (${firstPaymentParts(f.setupPence > 0, f.oneOffPence > 0)})`,
          `Then: ${gbpPence(f.monthlyPence)} a month, ${termSuffix(f.minimumTermMonths)}`,
        ]
      : [`${f.packageName}`, `Deposit: ${gbpPence(f.oneOffPence)}`];
  return {
    subject: `Your website is waiting [${f.reference}]`,
    text: [
      `Hi ${first(f.name)},`,
      "",
      "Thanks for getting started with us. If you didn't finish, this link picks up where you left off:",
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
          `First payment: ${gbpPence(f.setupPence + f.oneOffPence + f.monthlyPence)} (${firstPaymentParts(f.setupPence > 0, f.oneOffPence > 0)})`,
          `Then: ${gbpPence(f.monthlyPence)} a month, ${termSuffix(f.minimumTermMonths)}`,
          ...(f.ownershipAfterPayments > 0
            ? [`Ownership of your agreed website transfers to you after ${f.ownershipAfterPayments} successful monthly payments.`]
            : []),
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
      termLine(f.minimumTermMonths),
      "",
      "What happens next: we'll be in touch within one working day to start your website. Stripe emails a receipt for every payment.",
      "",
      "Your agreement",
      f.ownershipAfterPayments > 0
        ? `Ownership: after ${f.ownershipAfterPayments} successful monthly payments, ownership of your agreed website deliverables transfers to you.`
        : "We look after your website for as long as your subscription is active. Your domain name and the content you give us stay yours.",
      ...sign,
    ].join("\n"),
  };
}

export function paymentReceivedEmail(f: SubscriptionEmailFacts, amountPence: number): { subject: string; text: string } {
  const count = f.paymentsCount ?? 0;
  // Rolling monthly subscriptions count towards nothing: a plain receipt.
  if (f.ownershipAfterPayments <= 0) {
    return {
      subject: `Payment received [${f.reference}]`,
      text: [`Hi ${first(f.name)},`, "", `We've received your ${gbpPence(amountPence)} payment. Thank you.`, ...sign].join("\n"),
    };
  }
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
