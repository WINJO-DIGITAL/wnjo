import { CARE_PLANS, WEBSITE_PLANS } from "./pricing";

/**
 * A plan button (?plan=silver) lands on the short checkout: name, business, email, then pay. A saved draft, a website
 * project (?type=), a care plan (?care=) or ?full=1 keeps the full brief steps instead.
 */
export function isShortCheckout(params: { plan?: string; type?: string; care?: string; draft?: string; full?: string }): boolean {
  return Boolean(params.plan && params.plan in WEBSITE_PLANS) && !params.type && !params.care && !params.draft && !params.full;
}

/**
 * A /build link that says nothing about what the visitor chose: no plan, no website project, no care plan, no saved
 * draft and no ?full=1. It would open the price form already on Core £99, as though they had picked it, so the page
 * sends them to the plans to choose instead.
 */
export function isPlanlessBuild(params: { plan?: string; type?: string; care?: string; draft?: string; full?: string }): boolean {
  const hasPlan = Boolean(params.plan && params.plan in WEBSITE_PLANS);
  const hasProject = params.type === "oneOff";
  const hasCare = Boolean(params.care && params.care in CARE_PLANS && params.care !== "none");
  return !hasPlan && !hasProject && !hasCare && !params.draft && !params.full;
}
