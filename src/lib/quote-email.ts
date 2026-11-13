/** The plain-text email a customer gets with their instant quote. Prices are whole pounds. Pure, so it is tested. */
export function quoteEmail(input: { name: string; quoteReference: string; low: number; high: number; siteUrl: string }) {
  const gbp = (n: number) => `£${n.toLocaleString("en-GB")}`;
  const first = input.name.trim().split(/\s+/)[0] || "there";
  const site = input.siteUrl.replace(/\/+$/, "");
  return {
    subject: `Your quote [${input.quoteReference}]`,
    text: [
      `Hi ${first},`,
      "",
      `Reference: ${input.quoteReference}`,
      "",
      `Thanks for your brief. Your quote is ready: ${gbp(input.low)} to ${gbp(input.high)}. No VAT is added.`,
      "",
      `To see the full quote and accept it, sign in at ${site}/account with this email address.`,
      "",
      "WINJO DIGITAL",
    ].join("\n"),
  };
}
