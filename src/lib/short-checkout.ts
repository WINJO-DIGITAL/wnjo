import { WEBSITE_PLANS } from "./pricing";

/**
 * A plan button (?plan=silver) lands on the short checkout: name, business, email, then pay. A saved draft, a website
 * project (?type=), a care plan (?care=) or ?full=1 keeps the full brief steps instead.
 */
export function isShortCheckout(params: { plan?: string; type?: string; care?: string; draft?: string; full?: string }): boolean {
  return Boolean(params.plan && params.plan in WEBSITE_PLANS) && !params.type && !params.care && !params.draft && !params.full;
}
