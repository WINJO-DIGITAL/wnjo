import { depositPence } from "@/lib/deposit";
import { CARE_PLANS, formatGBP, PACKAGES } from "@/lib/pricing";

/**
 * The four things a customer needs to know about the money, in order. Every figure comes from the price list and
 * the deposit rule, so this page cannot drift from them. Pure, so it is tested without rendering.
 */
export function pricingSteps() {
  const essential = PACKAGES.essential;
  const deposit = depositPence(essential.from * 100);
  const handover = essential.includes.find((line) => /handover support/.test(line)) ?? "Launch and handover support";
  const days = handover.match(/(\d+) days/)?.[1];
  return [
    {
      id: "start",
      label: "To start",
      figure: `from ${formatGBP(essential.from)}`,
      text: `Your exact price comes in writing first. Then a 50% deposit (${formatGBP(deposit / 100)} on Essential) starts the work.`,
    },
    {
      id: "finish",
      label: "Before launch",
      figure: "The other 50%",
      text: "Paid once you have reviewed the finished site and before it goes live, so you see the work first.",
    },
    {
      id: "monthly",
      label: "Optional each month",
      figure: `${formatGBP(CARE_PLANS.hosting.monthly)} a month`,
      text: "Managed hosting, SSL certificate, daily backups and uptime monitoring. You can host the site yourself instead.",
    },
    {
      id: "after",
      label: "After launch",
      figure: days ? `${days} days of support` : "Handover support",
      text: "After that, host the site yourself or choose a care plan. Work beyond your plan is quoted and agreed before it starts.",
    },
  ] as const;
}
