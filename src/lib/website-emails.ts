/**
 * Emails for website quotes. Plain text, so nothing a visitor typed is ever rendered as HTML. Each one states the
 * first payment and the ongoing payment separately, and says that the final price is confirmed in writing.
 */
import { LEGAL_REVIEW_PENDING, OWNERSHIP, formatGBP } from "./pricing";
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
    `Thank you for building your website quote with WINJO DIGITAL. Your reference is ${reference}.`,
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
  return { subject: `Your WINJO DIGITAL website quote [${reference}]`, text };
}

export function ownerSubject(details: WebsiteDetails, quote: WebsiteQuote, intent: Intent, reference: string): string {
  const what =
    quote.mode === "monthly"
      ? `${quote.packageName} ${formatGBP(quote.monthly)}/month`
      : `One-off ${quote.hasFromPrices ? "from " : ""}${formatGBP(quote.oneOffTotal)}`;
  const kind = intent === "callback" ? "Callback request" : "Website quote";
  return `${kind} from ${details.businessName || details.name}: ${what} [${reference}]`.replace(/\s+/g, " ").slice(0, 200);
}
