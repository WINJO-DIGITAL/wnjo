/** Emails for the build journey. Plain text; nothing the customer typed is rendered as HTML. */

const first = (name: string) => name.trim().split(/\s+/)[0] || "there";

export function proposalReadyEmail(args: { name: string; reference: string; accountUrl: string }): { subject: string; text: string } {
  return {
    subject: `Your website proposal is ready [${args.reference}]`,
    text: [
      `Hi ${first(args.name)},`,
      "",
      "Your website proposal is ready. Sign in to your account to read it and accept or decline:",
      args.accountUrl,
      "",
      "Sign in with this email address. Nothing is charged until you accept and make your first payment.",
      "",
      "WINJO DIGITAL",
    ].join("\n"),
  };
}
