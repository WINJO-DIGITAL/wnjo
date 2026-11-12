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

/** Staff have handed the website over once the final payment was in. `message` is what staff add: where the files are, the domain. */
export function handedOverEmail(args: { name: string; reference: string; accountUrl: string; message?: string }): { subject: string; text: string } {
  return {
    subject: `Your website is handed over [${args.reference}]`,
    text: [
      `Hi ${first(args.name)},`,
      "",
      "Your final payment is in, and your website is now handed over to you, as set out in our terms.",
      ...(args.message ? ["", args.message] : []),
      "",
      "You own your domain name and the content you gave us, and you can see everything we built in your account:",
      args.accountUrl,
      "",
      "If you'd like us to look after it for you, or you need anything else, just reply to this email.",
      "",
      "WINJO DIGITAL",
    ].join("\n"),
  };
}
