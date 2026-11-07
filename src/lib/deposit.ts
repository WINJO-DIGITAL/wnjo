/**
 * The deposit a client pays when they accept a quote: 50% of the quoted total, in whole pence.
 * WNJO does not charge VAT, so the total is the price the client accepted and nothing is added to it.
 * Odd pence round half up, so the client never pays less than half and the balance is the rest.
 */
export const DEPOSIT_PERCENT = 50;

export function depositPence(totalPence: number): number {
  if (!Number.isInteger(totalPence) || totalPence < 0) {
    throw new RangeError("The quoted total must be a whole number of pence, zero or more.");
  }
  return Math.floor((totalPence * DEPOSIT_PERCENT + 50) / 100);
}

/** What is still owed after the deposit. Always the total minus the deposit, so nothing is lost to rounding. */
export function balancePence(totalPence: number): number {
  return totalPence - depositPence(totalPence);
}
