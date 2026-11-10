/** Emails for the build journey. Plain text; nothing the customer typed is rendered as HTML. */

const first = (name: string) => name.trim().split(/\s+/)[0] || "there";

export function proposalReadyEmail(args: { name: string; reference: string; accountUrl: string }): { subject: string; text: string } {
  return {
    subject: `Your proposal is ready [${args.reference}]`,
    text: [
      `Hi ${first(args.name)},`,
      "",
      "We've put your proposal together. Sign in to read it and let us know what you think:",
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
    subject: `Your changes are done [${args.reference}]`,
    text: [
      `Hi ${first(args.name)},`,
      "",
      "We've made the changes you asked for. Sign in to your account to take another look, or ask for anything else:",
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
    subject: `Your website is ready to look at [${args.reference}]`,
    text: [
      `Hi ${first(args.name)},`,
      "",
      "We've finished the first version of your website. Sign in to your account to take a look:",
      args.accountUrl,
      "",
      "Sign in with this email address.",
      "",
      "WINJO DIGITAL",
    ].join("\n"),
  };
}
