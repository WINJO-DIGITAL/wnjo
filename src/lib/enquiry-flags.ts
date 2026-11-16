/**
 * A light check for unsolicited SEO and marketing pitches. A match is a flag for the owner.
 * The enquiry is still saved and still acknowledged. A person asking for a website is not a pitch.
 */

const SIGNALS: { pattern: RegExp; reason: string }[] = [
  { pattern: /\bguest posts?\b/i, reason: "mentions a guest post" },
  { pattern: /\bback-?links?\b/i, reason: "mentions backlinks" },
  { pattern: /\blink building\b/i, reason: "mentions link building" },
  { pattern: /\bdomain authority\b/i, reason: "mentions domain authority" },
  { pattern: /\b(seo|search engine optimi[sz]ation) (services|agency|expert|specialist|package)\b/i, reason: "offers SEO services" },
  { pattern: /\bour (seo|marketing) (team|agency|company|experts)\b/i, reason: "introduces a marketing agency" },
  { pattern: /\bwe (can|will) (help you |get you )?(rank|improve your (ranking|seo|traffic))\b/i, reason: "offers to improve rankings" },
  { pattern: /\bincrease your (organic )?traffic\b/i, reason: "offers to increase traffic" },
];

/** Short reasons to show the owner, or none. Never used to discard an enquiry. */
export function pitchFlags(message: string): string[] {
  return SIGNALS.filter((signal) => signal.pattern.test(message)).map((signal) => signal.reason);
}
