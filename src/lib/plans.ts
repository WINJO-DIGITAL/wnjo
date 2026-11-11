import type { PlanCard } from "@/components/interactive/PlanSwiper";
import {
  CARE_PLANS,
  PACKAGES,
  SCOPED_FROM,
  formatGBP,
  WEBSITE_PAGE_BANDS,
  type CarePlan,
  type PackageId,
  type WebsitePageBand,
} from "./pricing";

const careOrder: CarePlan[] = ["hosting", "care", "carePlus"];

/** Hosting and care plans as selectable cards; each opens the configurator with that plan chosen. */
export const carePlanCards: PlanCard[] = careOrder.map((id) => ({
  id,
  name: CARE_PLANS[id].label,
  summary: CARE_PLANS[id].summary,
  price: formatGBP(CARE_PLANS[id].monthly),
  suffix: "/month",
  includes: CARE_PLANS[id].includes,
  href: `/build/project?care=${id}`,
  cta: `Choose ${CARE_PLANS[id].label}`,
}));

const packageOrder: PackageId[] = ["essential", "professional", "premium"];
/**
 * The smallest page size on the price form that holds each package's pages (Essential 5, Professional 12, Premium 25).
 * Read from the form's own sizes, so a package can never pass one the form doesn't recognise.
 */
export const packagePages = Object.fromEntries(
  packageOrder.map((id) => {
    const bands = Object.keys(WEBSITE_PAGE_BANDS) as WebsitePageBand[];
    const fit = bands.find((b) => {
      const max = WEBSITE_PAGE_BANDS[b].max;
      return max === null || max >= PACKAGES[id].pageLimit;
    });
    return [id, fit ?? bands[bands.length - 1]];
  }),
) as Record<PackageId, WebsitePageBand>;

/** Website packages as selectable cards with their full inclusions; each opens the configurator. */
export const packagePlanCards: PlanCard[] = packageOrder.map((id) => ({
  id,
  selectable: true,
  name: PACKAGES[id].name,
  summary: PACKAGES[id].summary,
  price: formatGBP(PACKAGES[id].from),
  from: true,
  includes: PACKAGES[id].includes,
  href: `/build/project?pages=${packagePages[id]}`,
  cta: "Get my proposal",
}));

/** App development, priced after scoping. It is not a website package, so it can't be picked in the flow. */
export const appPlanCard: PlanCard = {
  id: "apps",
  selectable: false,
  name: "App development",
  summary: "Web and mobile apps, customer portals and internal tools.",
  price: formatGBP(SCOPED_FROM.software),
  from: true,
  includes: [
    "Discovery call and written scope",
    "Fixed price and payment schedule",
    "A working app delivered in agreed stages",
  ],
  href: "/contact?topic=bespoke",
  cta: "Plan my app",
  variant: "inverse",
};
