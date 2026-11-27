import { formatGBP } from "./pricing";

/**
 * The WINJO Black Friday offer (owner's brief, updated 27 November 2026): a 14-day free trial on any managed website
 * plan. Browser-safe, so the banner, the plan cards, the checkout and the server all read the same dates and rules.
 *
 * - Sign-ups from Friday 27 November 2026 until Monday 30 November 2026, 23:59 UK time. The UK is on GMT then, so the
 *   last moment is 23:59:59 UTC. After that the offer switches itself off: the banner and badges disappear and the
 *   sign-up endpoint refuses the trial, whatever the browser says.
 * - A card is taken at sign-up through Stripe Checkout (a 14-day trial) and billing starts on day 15. Cancelling
 *   before day 15 costs nothing: the plan ends when the trial does and Stripe never charges.
 * - No minimum term (owner, 27 November 2026): offer sign-ups are rolling monthly, like every other plan.
 * - Stripe sends customer.subscription.trial_will_end 3 days before the first charge; we email a reminder then.
 */
export const BLACK_FRIDAY = {
  /** Sent by the checkout and stored with the offer, so the server knows which offer the customer agreed to. */
  code: "black-friday-2026",
  startsAt: "2026-11-27T00:00:00Z",
  endsAt: "2026-11-30T23:59:59Z",
  /** The last moment, as people read it. */
  endsLabel: "Monday 30 November, 23:59 UK time",
  trialDays: 14,
} as const;

/** The day billing starts: the day after the trial. */
export const FIRST_BILL_DAY = BLACK_FRIDAY.trialDays + 1;

/** The headline, in the owner's words. */
export const OFFER_HEADLINE = `FREE bespoke website for ${BLACK_FRIDAY.trialDays} days`;

/** The line that sits next to the headline everywhere: the price after the trial, and that cancelling is free. */
export const CANCEL_FREE = `cancel before day ${FIRST_BILL_DAY} and pay nothing`;
export function afterTrialLine(monthlyPounds: number | null): string {
  return monthlyPounds === null ? `then from ${formatGBP(99)}/mo · ${CANCEL_FREE}` : `then ${formatGBP(monthlyPounds)}/mo · ${CANCEL_FREE}`;
}

export const MOTTO = "Your goal is to do your business. Our goal is to grow it.";

const START_MS = Date.parse(BLACK_FRIDAY.startsAt);
// Inclusive of the whole final second.
const END_MS = Date.parse(BLACK_FRIDAY.endsAt) + 999;

/** Whether a sign-up at this moment gets the free trial. */
export function blackFridayActiveAt(nowMs: number): boolean {
  return Number.isFinite(nowMs) && nowMs >= START_MS && nowMs <= END_MS;
}

/** Milliseconds until the offer ends, or 0 once it has. Lets an open page switch the offer off on time. */
export function msUntilBlackFridayEnds(nowMs: number): number {
  return Math.max(0, END_MS - nowMs);
}

/**
 * Only a plain monthly plan qualifies: no setup fee and no one-off extras, so nothing at all is charged during the trial.
 * Anything with an upfront amount goes through the standard checkout.
 */
export function blackFridayEligible(quote: { mode: "monthly" | "oneOff"; setup: number; oneOffTotal: number; monthly: number }): boolean {
  return quote.mode === "monthly" && quote.setup === 0 && quote.oneOffTotal === 0 && quote.monthly > 0;
}

/** The day billing starts for a sign-up at this moment: day 15, i.e. 14 days after sign-up (when Stripe's trial ends). */
export function blackFridayFirstBillDate(signUp: Date): Date {
  return new Date(signUp.getTime() + BLACK_FRIDAY.trialDays * 86_400_000);
}

/** What is kept with the offer row, so the checkout, the webhook and the pages all know the customer took the offer. */
export type BlackFridaySnapshot = {
  code: typeof BLACK_FRIDAY.code;
  trialDays: number;
  agreedAt: string;
};

export function blackFridayOf(snapshot: unknown): BlackFridaySnapshot | null {
  const offer = (snapshot && typeof snapshot === "object" ? (snapshot as { offer?: unknown }).offer : null) as
    | Partial<BlackFridaySnapshot>
    | null
    | undefined;
  if (!offer || offer.code !== BLACK_FRIDAY.code) return null;
  return {
    code: BLACK_FRIDAY.code,
    trialDays: typeof offer.trialDays === "number" ? offer.trialDays : BLACK_FRIDAY.trialDays,
    agreedAt: typeof offer.agreedAt === "string" ? offer.agreedAt : "",
  };
}
