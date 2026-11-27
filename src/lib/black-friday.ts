import { WEBSITE_PLANS, formatGBP } from "./pricing";

/**
 * The WINJO Black Friday offer (owner's brief, updated 27 November 2026): a 14-day free trial on the Core plan only
 * (owner, 12:16). Plus and Pro keep their standard checkout: no trial, no badge, the standard cooling-off box. Browser-safe, so the banner, the plan cards, the checkout and the server all read the same dates and rules.
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
  /** The only plan the trial applies to (owner, 27 November 2026, 12:16): Core, stored as "bronze". */
  plan: "bronze",
} as const;

/** The Core plan, by name and price, for the copy. */
export const OFFER_PLAN = WEBSITE_PLANS[BLACK_FRIDAY.plan];

/** Whether a plan code is the one the offer applies to. Plus ("silver") and Pro ("gold") never are. */
export function blackFridayPlan(code: unknown): boolean {
  return code === BLACK_FRIDAY.plan;
}

/** The day billing starts: the day after the trial. */
export const FIRST_BILL_DAY = BLACK_FRIDAY.trialDays + 1;

/** The headline, in the owner's words: the badge on the Core card. */
export const OFFER_HEADLINE = `FREE bespoke website for ${BLACK_FRIDAY.trialDays} days`;
/** The headline where it isn't on the Core card itself (the banner): names the plan. */
export const OFFER_HEADLINE_PLAN = `${OFFER_HEADLINE} on our ${OFFER_PLAN.name} plan`;

/** The cooling-off box on the offer checkout only (owner's wording, 27 November 2026). The standard checkout keeps its own. */
export const OFFER_COOLING_OFF = "I understand I can cancel at any time before day 15 and pay nothing. After that, my plan is rolling monthly and I can cancel any time.";

export const CANCEL_FREE = `cancel before day ${FIRST_BILL_DAY} and pay nothing`;

/** The line that sits next to the headline everywhere: the price after the trial (Core's, unless given), and that cancelling is free. */
export function afterTrialLine(monthlyPounds: number = OFFER_PLAN.monthly): string {
  return `then ${formatGBP(monthlyPounds)}/mo · ${CANCEL_FREE}`;
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
 * Only the Core plan qualifies, as a plain monthly plan: no setup fee and no one-off extras, so nothing at all is charged during the trial.
 * Anything with an upfront amount goes through the standard checkout.
 */
export function blackFridayEligible(
  quote: { mode: "monthly" | "oneOff"; setup: number; oneOffTotal: number; monthly: number },
  plan: unknown,
): boolean {
  return blackFridayPlan(plan) && quote.mode === "monthly" && quote.setup === 0 && quote.oneOffTotal === 0 && quote.monthly > 0;
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

/**
 * The offer recorded with a row, or null. Only ever for the Core plan: a Plus or Pro row with an offer in its snapshot
 * (however it got there) gets no trial, so the checkout, the webhook and the pages all treat it as standard.
 */
export function blackFridayOf(snapshot: unknown, packageCode: unknown): BlackFridaySnapshot | null {
  if (!blackFridayPlan(packageCode)) return null;
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
