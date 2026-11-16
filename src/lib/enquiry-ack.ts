/**
 * The short note a person gets after a contact-form enquiry is saved. It quotes the reference and
 * what the contact page already says happens next. It does not promise a reply time.
 */

const BUSINESS_EMAIL = "hello@winjodigital.co.uk";

const firstName = (name: string) => name.trim().split(/\s+/)[0] || "there";

export function contactAcknowledgement(args: { name: string; reference: string; account?: boolean }): { subject: string; text: string } {
  const next = args.account
    ? "We'll read it and reply by email."
    : "We read your enquiry and reply by email. If it looks like a good fit, the next step is a short conversation or a written proposal. Nothing is charged until you agree to go ahead.";
  return {
    subject: `We've got your message [${args.reference}]`,
    text: [
      `Hi ${firstName(args.name)},`,
      "",
      `Thank you. We have your message. Your reference is ${args.reference}.`,
      "",
      "WHAT HAPPENS NEXT",
      next,
      "",
      "Reply to this email if you need to add anything. Please quote your reference.",
      "",
      "WINJO DIGITAL",
    ].join("\n"),
  };
}

/** Where a reply to the acknowledgement should go: the address published in the terms. */
export const ENQUIRY_REPLY_TO = BUSINESS_EMAIL;
