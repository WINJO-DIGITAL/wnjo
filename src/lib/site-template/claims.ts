import { sentencesOf, wordsOf } from "./text";

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

/** A word reduced to its root, so "shaves" matches "shave" and "trims" matches "trim". */
const stem = (w: string): string => w.replace(/ies$/, "y").replace(/(?:ing|es|s)$/, (m, offset: number) => (offset >= 3 ? "" : m));

const STOP = new Set(
  "a an and are as at be but by can do does for from get got has have how i if in is it its of on or our so that the their them then there these they this to up us we what when where which who will with you your yes no not any all may just also about over out into than too very per each one two more most some many much made make makes well".split(" "),
);
/** Everyday words a line about what a business does may use without naming anything new. */
const EVERYDAY = new Set("services service work jobs job everything anything things every day days week weekend morning evening time times call book booking bookings visit welcome walk walk-ins appointment appointments quote quotes".split(" "));

const OFFER_RE = /\b(offers?|offering|provides?|providing|specialis(?:e|es|ing)|specializ(?:e|es|ing)|as well as|including|such as)\b/i;

/**
 * Things a line says the business offers that the customer never listed. A sentence that says what a business "offers",
 * "provides" or "specialises in", "including" or "such as" something is read: every other word in it must come from
 * the customer's facts (allowing for plurals). This is what catches a service the customer never named ("beard
 * transplants") that no claim word would.
 */
export function unknownOffers(line: string, facts: string): string[] {
  const known = new Set(wordsOf(facts).map(stem));
  const out = new Set<string>();
  for (const sentence of sentencesOf(line)) {
    const m = OFFER_RE.exec(sentence);
    if (!m) continue;
    for (const w of wordsOf(sentence.slice(m.index + m[0].length))) {
      if (w.length < 4 || STOP.has(w) || EVERYDAY.has(w) || known.has(stem(w))) continue;
      out.add(w);
    }
  }
  return [...out];
}

const WEEKDAYS_AND_MONTHS = new Set("monday tuesday wednesday thursday friday saturday sunday january february march april may june july august september october november december".split(" "));

/**
 * Names in a line that the customer didn't give: a capitalised word in the middle of a sentence (a person, a place, a
 * brand, a qualification) that isn't in their facts. The first word of a sentence is skipped, because it is capitalised
 * anyway. Days and months are allowed.
 */
export function unknownNames(line: string, facts: string): string[] {
  const known = new Set(wordsOf(facts));
  const out = new Set<string>();
  for (const sentence of sentencesOf(line)) {
    const tokens = sentence.split(/\s+/).slice(1);
    for (const raw of tokens) {
      const word = raw.replace(/^[^\p{L}]+|[^\p{L}'-]+$/gu, "");
      if (!/^[A-Z][a-z]{2,}/.test(word)) continue;
      const lower = word.toLowerCase().replace(/'s$/, "");
      if (known.has(lower) || WEEKDAYS_AND_MONTHS.has(lower)) continue;
      out.add(word);
    }
  }
  return [...out];
}
