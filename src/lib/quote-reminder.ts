/** A quote still open after this many days gets one reminder. */
export const REMINDER_AFTER_DAYS = 3;

/** The reminder email. Plain text, one message, no pressure: it restates the quote and how to accept it. */
export function reminderEmail(input: { name: string; quoteReference: string; siteUrl: string }) {
  const first = input.name.trim().split(/\s+/)[0] || "there";
  const site = input.siteUrl.replace(/\/+$/, "");
  return {
    subject: `Your WINJO DIGITAL quote ${input.quoteReference} is still open`,
    text: [
      `Hi ${first},`,
      "",
      `Reference: ${input.quoteReference}`,
      "",
      `Just a reminder that quote ${input.quoteReference} is still waiting for you.`,
      "",
      `To see it in full and accept it, sign in at ${site}/account with this email address.`,
      "",
      "If you have questions, reply to this email and we'll help.",
      "",
      "WINJO DIGITAL",
    ].join("\n"),
  };
}

/** The cut-off time: quotes sent before this moment are due a reminder. */
export function reminderCutoff(now: Date, days = REMINDER_AFTER_DAYS): string {
  return new Date(now.getTime() - days * 86_400_000).toISOString();
}
