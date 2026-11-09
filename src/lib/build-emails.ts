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

export function previewReadyAgainEmail(args: { name: string; reference: string; accountUrl: string }): { subject: string; text: string } {
  return {
    subject: `Your changes are ready to review [${args.reference}]`,
    text: [
      `Hi ${first(args.name)},`,
      "",
      "We've finished the changes you asked for. Sign in to your account to look through your website and approve it, or ask for anything else:",
      args.accountUrl,
      "",
      "Sign in with this email address.",
      "",
      "WINJO DIGITAL",
    ].join("\n"),
  };
}

export function previewReadyEmail(args: { name: string; reference: string; accountUrl: string }): { subject: string; text: string } {
  return {
    subject: `Your website preview is ready [${args.reference}]`,
    text: [
      `Hi ${first(args.name)},`,
      "",
      "Your website preview is ready. Sign in to your account to look through it, ask for changes, or approve it:",
      args.accountUrl,
      "",
      "Sign in with this email address.",
      "",
      "WINJO DIGITAL",
    ].join("\n"),
  };
}
