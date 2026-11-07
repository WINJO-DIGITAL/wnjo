/** The plain-text email a customer gets with their instant quote. Prices are whole pounds. Pure, so it is tested. */
export function quoteEmail(input: { name: string; quoteReference: string; low: number; high: number; siteUrl: string }) {
  const gbp = (n: number) => `£${n.toLocaleString("en-GB")}`;
  const first = input.name.trim().split(/\s+/)[0] || "there";
  const site = input.siteUrl.replace(/\/+$/, "");
  return {
    subject: `Your WNJO quote ${input.quoteReference}`,
    text: [
      `Hi ${first},`,
      "",
      `Thanks for your brief. Your quote ${input.quoteReference} is ready: ${gbp(input.low)} to ${gbp(input.high)}, with no VAT added.`,
      "",
      `To see the full quote and accept it, sign in at ${site}/account with this email address.`,
      "",
      "WNJO",
    ].join("\n"),
  };
}
