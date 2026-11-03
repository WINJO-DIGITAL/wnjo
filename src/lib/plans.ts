import type { PlanCard } from "@/components/interactive/PlanSwiper";
import { CARE_PLANS, PACKAGES, formatGBP, type CarePlan, type PackageId } from "./pricing";

const careOrder: CarePlan[] = ["hosting", "care", "carePlus"];

/** Hosting and care plans as selectable cards; each opens the configurator with that plan chosen. */
export const carePlanCards: PlanCard[] = careOrder.map((id) => ({
  id,
  name: CARE_PLANS[id].label,
  summary: CARE_PLANS[id].summary,
  price: formatGBP(CARE_PLANS[id].monthly),
  suffix: "/month",
  includes: CARE_PLANS[id].includes,
  href: `/build?care=${id}`,
  cta: `Choose ${CARE_PLANS[id].label}`,
}));

const packageOrder: PackageId[] = ["essential", "professional", "premium"];
const packagePages: Record<PackageId, string> = { essential: "1-5", professional: "6-12", premium: "13-25" };

/** Website packages as selectable cards with their full inclusions; each opens the configurator. */
export const packagePlanCards: PlanCard[] = packageOrder.map((id) => ({
  id,
  name: PACKAGES[id].name,
  summary: PACKAGES[id].summary,
  price: formatGBP(PACKAGES[id].from),
  from: true,
  includes: PACKAGES[id].includes,
  href: `/build?pages=${packagePages[id]}`,
  cta: "Get my price",
}));

/** App development, priced after scoping. */
export const appPlanCard: PlanCard = {
  id: "apps",
  name: "App development",
  summary: "Web and mobile apps, customer portals and internal tools.",
  price: "Custom quote",
  includes: [
    "Discovery call and written scope",
    "Fixed price and payment schedule",
    "A working app delivered in agreed stages",
  ],
  href: "/contact?topic=bespoke",
  cta: "Plan my app",
  variant: "inverse",
};
