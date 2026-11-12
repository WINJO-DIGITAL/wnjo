import type { Route } from "./build-journey";

/**
 * What a customer pays on the spot, straight from their quote. Browser-safe (no Node code), so the same rule drives
 * the button on the page and the check on the server.
 */

/** The deposit share for a one-off website, from the terms ("Deposits and balances"). */
export const ONE_OFF_DEPOSIT_SHARE = 0.5;

const pence = (pounds: number) => Math.round(pounds * 100);

/**
 * The amount to take now, or null when the build needs a written proposal first. A monthly package takes its first
 * payment (setup, any one-off extras and the first month); a one-off website takes the deposit share (50%). Bespoke
 * builds over the proposal threshold never pay from the quote: they pay the deposit only after they've accepted an
 * approved proposal.
 */
export function payNowFor(
  route: Route,
  q: { mode: "monthly" | "oneOff"; initialPayment: number; oneOffTotal: number; requiresQuote: boolean },
): { kind: "first_payment" | "deposit"; pence: number } | null {
  if (route !== "package" || q.requiresQuote) return null;
  const amount = q.mode === "monthly" ? q.initialPayment : q.oneOffTotal * ONE_OFF_DEPOSIT_SHARE;
  const value = pence(amount);
  if (!(value > 0)) return null;
  return { kind: q.mode === "monthly" ? "first_payment" : "deposit", pence: value };
}

/**
 * What a customer pays after accepting a bespoke proposal. The same sums the server uses to charge, so the figure on
 * the button always matches the charge: a one-off build takes 50% of the agreed price as its deposit; a monthly build
 * takes its setup, one-off extras and first month.
 */
export function proposalPayNowFor(
  mode: "monthly" | "oneOff",
  agreed: { setup_pence: number; monthly_pence: number; one_off_pence: number },
): { kind: "first_payment" | "deposit"; pence: number } {
  if (mode === "monthly") return { kind: "first_payment", pence: agreed.setup_pence + agreed.one_off_pence + agreed.monthly_pence };
  return { kind: "deposit", pence: Math.round(agreed.one_off_pence * ONE_OFF_DEPOSIT_SHARE) };
}

/**
 * What is still to pay on a one-off website once the deposit is in: the agreed price minus the deposit, which is
 * 50% rounded as `proposalPayNowFor` rounds it, so the two parts always add up to the agreed price exactly.
 */
export function balancePenceFor(agreedOneOffPence: number): number {
  return Math.max(0, agreedOneOffPence - Math.round(agreedOneOffPence * ONE_OFF_DEPOSIT_SHARE));
}

/** The name of the Stripe line and offer row for the final payment, which the webhook and the balance route both use. */
export const BALANCE_PACKAGE_NAME = "Final payment for your website";
