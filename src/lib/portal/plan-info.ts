import { CARE_PLANS, REFRESH, SUBSCRIPTION_TERMS, WEBSITE_PLANS } from "@/lib/pricing";

/**
 * What a plan includes, looked up by the plan code stored on a subscription. Everything here is read from the pricing
 * file, so the portals can't drift from the public site or the terms.
 */
export type PlanInfo = {
  name: string;
  /** Managed website plans include the website itself; hosting and care plans look after a site the customer owns. */
  family: "managed" | "care" | "one_off" | "unknown";
  summary: string;
  includes: readonly string[];
  /** Working days within which we reply to a support message, when the plan states one. */
  replyWorkingDays: number | null;
  /** The plan's own wording for monthly changes, when it has an allowance. */
  changes: string | null;
  /** The planned refresh, for plans that include one. */
  refresh: string | null;
};

const MANAGED = ["bronze", "silver", "gold"] as const;
type ManagedCode = (typeof MANAGED)[number];
const isManaged = (code: string): code is ManagedCode => (MANAGED as readonly string[]).includes(code);
const CARE = ["hosting", "care", "carePlus"] as const;
type CareCode = (typeof CARE)[number];
const isCare = (code: string): code is CareCode => (CARE as readonly string[]).includes(code);

export function planInfo(code: string | null | undefined, fallbackName = "Your plan"): PlanInfo {
  const key = (code ?? "").trim();
  if (isManaged(key)) {
    const plan = WEBSITE_PLANS[key];
    return {
      name: plan.name,
      family: "managed",
      summary: plan.summary,
      includes: plan.includes,
      replyWorkingDays: SUBSCRIPTION_TERMS.replyWorkingDays[key],
      changes: plan.changes,
      refresh: REFRESH.plans.includes(key) ? `${REFRESH.levels[key].name} every ${REFRESH.everyMonths} months` : null,
    };
  }
  if (isCare(key)) {
    const plan = CARE_PLANS[key];
    return { name: plan.label, family: "care", summary: plan.summary, includes: plan.includes, replyWorkingDays: key === "carePlus" ? 1 : 2, changes: null, refresh: null };
  }
  if (key === "one_off") return { name: fallbackName, family: "one_off", summary: "A website you own outright once it is paid for.", includes: [], replyWorkingDays: null, changes: null, refresh: null };
  return { name: fallbackName, family: "unknown", summary: "", includes: [], replyWorkingDays: null, changes: null, refresh: null };
}

/** The rules every monthly plan runs on, in the customer's words. Read from the same figures as the terms. */
export const PLAN_RULES: readonly string[] = [
  "Rolling monthly from day one, with no minimum term.",
  "Cancel any time. Your plan runs to the end of the month you have paid for.",
  `Your website stays live for ${SUBSCRIPTION_TERMS.liveAfterEndDays} days after the end date, so a move never means downtime.`,
  `We give ${SUBSCRIPTION_TERMS.priceChangeNoticeDays} days' notice of any change to your monthly price.`,
];
