/**
 * Claims the wording makes about a business, checked against the facts the customer gave. A claim is a number that
 * isn't in the facts (a year, a count, a price-like figure) or a word that makes a promise or a comparison (award,
 * guarantee, qualified, best...) which the customer never wrote. Pure, so the rules are tested without a model.
 *
 * This is deliberately strict: an honest line can be flagged, and then the model is asked to write it again without the
 * claim. It is not a judgement of meaning: a claim the customer did write is always allowed.
 */

/** Words and phrases that make a promise, a comparison or a credential. Shared by every sector. */
export const CLAIM_PHRASES = [
  "award winning", "award", "awards", "winner", "winners", "best", "top rated", "top", "leading", "finest", "number one",
  "guarantee", "guaranteed", "guarantees", "warranty", "warranties", "qualified", "qualifications", "trained", "certified",
  "accredited", "registered", "insured", "experienced", "experience", "expertise", "established", "since", "years", "year",
  "trusted", "reviews", "rated", "rating", "ratings", "customers", "clients", "specialist", "specialists", "expert", "experts",
  "unbeatable", "cheapest", "lowest", "guaranteed results",
] as const;

const CLAIM_RE = new RegExp(`\\b(${CLAIM_PHRASES.map((p) => p.replace(/ /g, "\\s+")).join("|")})\\b`, "gi");
const NUMBER_RE = /\d+/g;

/** Lower case, hyphens and spaces treated alike, so "award-winning" and "award winning" match. */
export const plainText = (text: string): string => text.toLowerCase().replace(/[-–—]/g, " ").replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();

/**
 * The claims in a line that the customer's facts don't support. `facts` is every fact the customer gave, as text.
 * Returns each unsupported claim once, as the words the line used.
 */
/**
 * The numbers the facts give. A time such as 18:00 also counts as 6 (the same hour on a 12-hour clock), so "9 till 6"
 * in a sentence is accepted when the hours say 09:00 to 18:00.
 */
export function numbersIn(text: string): Set<number> {
  const out = new Set<number>();
  for (const m of text.match(NUMBER_RE) ?? []) {
    const n = Number(m);
    out.add(n);
    if (n > 12 && n <= 24) out.add(n - 12);
  }
  return out;
}

export function ungroundedClaims(line: string, facts: string): string[] {
  const corpus = ` ${plainText(facts)} `;
  const numbersInFacts = numbersIn(facts);
  const out = new Set<string>();
  for (const m of line.matchAll(CLAIM_RE)) {
    const phrase = plainText(m[0]);
    if (!corpus.includes(` ${phrase} `)) out.add(m[0]);
  }
  for (const n of line.match(NUMBER_RE) ?? []) if (!numbersInFacts.has(Number(n))) out.add(n);
  return [...out];
}
