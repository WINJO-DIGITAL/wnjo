import "server-only";
import { blackFridayActiveAt } from "./black-friday";

/**
 * The server's clock for the Black Friday offer. The server decides, never the browser.
 *
 * OFFER_CLOCK_OVERRIDE (an ISO date) lets a preview or a local build show the site as it will look on another day, for
 * example after the offer ends. It is ignored in production, so the live site always uses the real time.
 */
export function offerNowMs(env: Record<string, string | undefined> = process.env): number {
  const override = env.OFFER_CLOCK_OVERRIDE?.trim();
  if (override && env.VERCEL_ENV !== "production") {
    const ms = Date.parse(override);
    if (Number.isFinite(ms)) return ms;
  }
  return Date.now();
}

export function blackFridayActiveNow(env: Record<string, string | undefined> = process.env): boolean {
  return blackFridayActiveAt(offerNowMs(env));
}
