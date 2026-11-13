/**
 * Emails for website quotes. Plain text, so nothing a visitor typed is ever rendered as HTML. Each one states the
 * first payment and the ongoing payment separately, and says that the final price is confirmed in writing.
 */
import { CARE_PLANS, DELIVERY, LEGAL_REVIEW_PENDING, OWNERSHIP, formatGBP, formatPence } from "./pricing";
import { HOSTING_NAME, type HostingPlan, type WebsiteStatus } from "./hosting-request";
import { siteUrl } from "./site";
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
    "YOUR NEXT STEP",
    "Tell us about your website. Sign in with this email address and answer a few questions about your business, the pages you need and the style you like. There's no limit on pages, and nothing to pay yet:",
    `${siteUrl.replace(/\/+$/, "")}/account`,
    "",
    "WHAT HAPPENS NEXT",
    "We read what you send and write you a fixed-price proposal, in your account and by email.",
    "Nothing is charged until you have read and accepted that proposal.",
    "When you accept, the first payment is a 50% deposit and we start building. You can ask for changes as we go.",
    "When you're happy, you approve your website and pay the rest, and it's yours.",
    "",
    `Questions? Reply to this email, or see ${siteUrl.replace(/\/+$/, "")}/website-projects`,
    "",
    "WINJO DIGITAL",
  ].join("\n");
  return { subject: `Thank you. Now tell us about your website [${reference}]`, text };
}

/**
 * The acknowledgement for a hosting-only request. Nothing is charged yet: the owner sends a secure payment link, so
 * this says what to expect and what happens next, without promising a start date.
 */
const WEBSITE_SUMMARY: Record<WebsiteStatus, string> = {
  have: "Already built, to connect to hosting",
  need: "Still to be built",
  other: "Being built by someone else",
};

export function hostingAcknowledgement(args: { reference: string; details: WebsiteDetails; plan: HostingPlan; status: WebsiteStatus; siteUrl: string }): { subject: string; text: string } {
  const { reference, details, plan, status, siteUrl } = args;
  const site = siteUrl.replace(/\/+$/, "");
  const next =
    status === "have"
      ? `We'll check ${details.existingWebsite} and connect it to your hosting.`
      : status === "need"
        ? `Need a website as well? We can build one: a bespoke website from ${formatGBP(999)}, or a managed website from ${formatGBP(99)} a month with hosting included.`
        : "When your website is ready, we'll connect it to your hosting.";
  const text = [
    `Hi ${first(details.name)},`,
    "",
    "Thank you for choosing hosting with us.",
    "",
    "YOUR REQUEST",
    `Reference: ${reference}`,
    `Plan: ${HOSTING_NAME[plan]}`,
    `Monthly payment: ${formatGBP(CARE_PLANS[plan].monthly)}, taken automatically each month`,
    `Your website: ${WEBSITE_SUMMARY[status]}`,
    "",
    "WHAT HAPPENS NEXT",
    "We reply within one working day with a secure link to start your plan.",
    next,
    "Nothing is charged until you use that link. Rolling monthly, with 30 days' notice to end.",
    "",
    `Questions? Reply to this email, or see ${site}/website-projects`,
    "",
    "WINJO DIGITAL",
  ].join("\n");
  return { subject: `Thank you for choosing hosting [${reference}]`, text };
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
  /** Whether we still need the customer's goals, pages and style. Unset counts as yes, so nobody is left waiting. */
  needsDetails?: boolean;
  /** Set for a hosting-only plan, which has no website build behind it. */
  hosting?: { siteUrl: string; websiteStatus: WebsiteStatus };
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

/** The step that matters after paying: filling in the details form. It leads the email, with the link, and is dropped when we already have their details. */
function detailsStep(f: SubscriptionEmailFacts): string[] {
  const account = `${(siteUrl() ?? "https://winjodigital.co.uk").replace(/\/+$/, "")}/account`;
  if (f.needsDetails === false) return [`We already have your details, so we're starting on your website now. Once we have everything, it's live within ${DELIVERY.liveWithinDays} days.`];
  return [
    "Your next step is to tell us about your website. We can't start designing until we have it, and it only takes a few minutes.",
    "",
    "Sign in with this email address and share your goals, the pages you need and the style you like:",
    account,
    "",
    `We start designing as soon as you send it, and your website is live within ${DELIVERY.liveWithinDays} days of us having it.`,
  ];
}

/** Hosting is rolling monthly with 30 days' notice to end, as the pricing page says. */
const HOSTING_TERM = "Rolling monthly, with 30 days' notice to end.";

function hostingWelcome(f: SubscriptionEmailFacts, h: NonNullable<SubscriptionEmailFacts["hosting"]>): { subject: string; text: string } {
  const site = (siteUrl() ?? "https://winjodigital.co.uk").replace(/\/+$/, "");
  const next =
    h.websiteStatus === "have"
      ? `We'll connect your hosting to ${h.siteUrl || "your website"} and email you within one working day to confirm.`
      : h.websiteStatus === "need"
        ? "We'll email you within one working day to confirm, and we'll talk through your website with you."
        : "When your website is ready, reply to this email with its address and we'll connect it to your hosting.";
  return {
    subject: `Your hosting is active [${f.reference}]`,
    text: [
      `Hi ${first(f.name)},`,
      "",
      `Thank you. Your hosting is now active. You can see your plan and billing any time in your account:`,
      `${site}/account`,
      "",
      `Reference: ${f.reference}`,
      `Plan: ${f.packageName}`,
      `Monthly payment: ${gbpPence(f.monthlyPence)}, taken automatically each month`,
      "",
      "WHAT HAPPENS NEXT",
      next,
      ...(h.websiteStatus === "need"
        ? [`Need a website as well? Reply to this email, or see what we can build: ${site}/website-projects`]
        : []),
      `${HOSTING_TERM} Stripe emails a receipt for every payment.`,
      "",
      ...sign,
    ].join("\n"),
  };
}

/** The payment link for hosting, sent only when Stripe's page couldn't be opened for the customer. */
export function hostingPayLinkEmail(f: SubscriptionEmailFacts, link: string): { subject: string; text: string } {
  return {
    subject: `Your hosting is waiting [${f.reference}]`,
    text: [
      `Hi ${first(f.name)},`,
      "",
      "Thanks for choosing hosting with us. If you didn't finish, this link picks up where you left off:",
      link,
      "",
      `Plan: ${f.packageName}`,
      `Monthly payment: ${gbpPence(f.monthlyPence)}, taken automatically each month. ${HOSTING_TERM}`,
      "",
      "If you have already paid, you don't need to do anything.",
      "The link works for 30 days. Please don't share it.",
      ...sign,
    ].join("\n"),
  };
}

export function welcomeEmail(f: SubscriptionEmailFacts): { subject: string; text: string } {
  if (f.hosting) return hostingWelcome(f, f.hosting);
  const ask = f.needsDetails !== false;
  return {
    subject: ask ? `Thank you. Now tell us about your website [${f.reference}]` : `Welcome to WINJO DIGITAL [${f.reference}]`,
    text: [
      `Hi ${first(f.name)},`,
      "",
      `Thank you. Your first payment for the ${f.packageName} package has been received.`,
      "",
      ...detailsStep(f),
      "",
      `Monthly payment: ${gbpPence(f.monthlyPence)}, taken automatically each month.`,
      termLine(f.minimumTermMonths),
      "",
      "Stripe emails a receipt for every payment.",
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
      text: [`Hi ${first(f.name)},`, "", `We've received your ${gbpPence(amountPence)} payment. Thank you.`, "", `Reference: ${f.reference}`, `Package: ${f.packageName}`, "", ...sign].join("\n"),
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
      "",
      `Reference: ${f.reference}`,
      "",
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
      `Reference: ${f.reference}`,
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
      "",
      `Reference: ${f.reference}`,
      "",
      "If this isn't what you expected, reply to this email and we'll look into it straight away.",
      ...sign,
    ].join("\n"),
  };
}

export function oneOffPaidEmail(f: SubscriptionEmailFacts): { subject: string; text: string } {
  return {
    subject: f.needsDetails === false ? `Payment received [${f.reference}]` : `Payment received. Now tell us about your website [${f.reference}]`,
    text: [
      `Hi ${first(f.name)},`,
      "",
      `Your payment of ${gbpPence(f.oneOffPence)} has arrived.`,
      "",
      ...(f.needsDetails === false ? ["We already have your details, and we'll be in touch within one working day to begin."] : detailsStep(f)),
      "",
      "Stripe emails you a receipt for the payment.",
      ...sign,
    ].join("\n"),
  };
}

/** The final payment on a website bought outright has arrived. Handover comes from staff, so it says what happens next. */
export function balanceReceivedEmail(f: SubscriptionEmailFacts): { subject: string; text: string } {
  return {
    subject: `Final payment received [${f.reference}]`,
    text: [
      `Hi ${first(f.name)},`,
      "",
      `Your final payment of ${gbpPence(f.oneOffPence)} has arrived. Thank you.`,
      "",
      "We'll check everything one last time, then hand your website over to you. We'll email you as soon as it's yours, with what you need to know.",
      "",
      "Stripe emails you a receipt for the payment.",
      ...sign,
    ].join("\n"),
  };
}

/** Sent the moment a customer asks to cancel on their account, so they have a clear record of when they asked. */
export function cancelRequestEmail(f: SubscriptionEmailFacts & { endsOn?: string }): { subject: string; text: string } {
  const endsOn = f.endsOn ? new Date(f.endsOn).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/London" }) : null;
  return {
    subject: endsOn ? `Your cancellation is confirmed [${f.reference}]` : `We've received your cancellation request [${f.reference}]`,
    text: [
      `Hi ${first(f.name)},`,
      "",
      endsOn
        ? `Your ${f.packageName} plan (${f.reference}) is cancelled. It ends on ${endsOn}, the end of the billing period you've already paid for. No further payments will be taken after that, and your website stays live until then.`
        : `We've received your request to cancel your ${f.packageName} plan (${f.reference}). We'll confirm by email when it will end. Your website stays live until then.`,
      "",
      "If you didn't ask to cancel, or you've changed your mind, reply to this email and we'll leave things as they are.",
      ...sign,
    ].join("\n"),
  };
}

/**
 * A reminder before a plan's minimum term ends, and every six months after. It says what the customer pays and how to
 * cancel, so renewing is never a surprise.
 */
export function renewalReminderEmail(f: SubscriptionEmailFacts, siteUrl: string, termEnds: string | null): { subject: string; text: string } {
  const account = `${siteUrl.replace(/\/+$/, "")}/account/billing`;
  return {
    subject: `A reminder about your website plan [${f.reference}]`,
    text: [
      `Hi ${first(f.name)},`,
      "",
      `This is a reminder about your ${f.packageName} plan (${f.reference}). It costs ${gbpPence(f.monthlyPence)} a month and renews every month until you cancel.`,
      ...(termEnds ? [`Your minimum term ends on ${termEnds}. After that, the plan carries on month to month.`] : []),
      "",
      `If you'd like to cancel, sign in and choose "Request cancellation": ${account}`,
      "If you'd like to change your plan instead, reply to this email.",
      ...sign,
    ].join("\n"),
  };
}
