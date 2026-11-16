import { CARE_PLANS, ONE_OFF_TIERS, REFRESH, WEBSITE_PLANS, formatGBP } from "@/lib/pricing";
import { projects } from "@/lib/projects";
import { siteUrl } from "@/lib/site";

export const dynamic = "force-static";

/**
 * A plain-text summary of the business for AI tools (llms.txt). It is built from the same price list and project list
 * the pages use, so it can never state a price or a client the website doesn't.
 */
export function GET() {
  const base = (siteUrl() ?? "https://winjodigital.co.uk").replace(/\/+$/, "");
  const plans = (["bronze", "silver", "gold"] as const).map((id) => `- ${WEBSITE_PLANS[id].name}: ${formatGBP(WEBSITE_PLANS[id].monthly)} a month, up to ${WEBSITE_PLANS[id].pages} pages. ${WEBSITE_PLANS[id].tagline}`);
  const tiers = (["essential", "professional", "premium"] as const).map((id) => `- ${ONE_OFF_TIERS[id].name}: from ${formatGBP(ONE_OFF_TIERS[id].from)}, up to ${ONE_OFF_TIERS[id].pageLimit} pages. ${ONE_OFF_TIERS[id].summary}`);
  const hosting = (["hosting", "care", "carePlus"] as const).map((id) => `- ${CARE_PLANS[id].label}: ${formatGBP(CARE_PLANS[id].monthly)} a month. ${CARE_PLANS[id].summary}`);
  const text = [
    "# WINJO DIGITAL",
    "",
    "> A UK web design business based in Thornton-Cleveleys, Lancashire. Managed websites are built on a sector design and tailored to the business, for one monthly payment. Website projects are designed from scratch and bought outright.",
    "",
    "## Managed websites (monthly, no minimum term)",
    "A sector design tailored to the business, plus hosting, maintenance, updates and support, in one monthly payment. Cancel any time.",
    ...plans,
    `Every plan includes WINJO Refresh, a design refresh every ${REFRESH.everyMonths} months.`,
    "",
    "## Own your website (bought outright)",
    "A website designed from scratch, paid up front and yours on full payment. A written proposal confirms the price before anything is paid.",
    ...tiers,
    "",
    "## Hosting and care (for a website you own)",
    "Rolling monthly. Cancel any time, and your plan runs to the end of the month you have paid for.",
    ...hosting,
    "",
    "## Also",
    "- Booking system development",
    "- Custom software and app development",
    "",
    "## Our work",
    ...projects.map((p) => `- ${p.name}: ${p.sector}. ${p.url}`),
    "",
    "## Pages",
    `- [Managed websites](${base}/managed-websites)`,
    `- [Pricing](${base}/pricing)`,
    `- [Own your website](${base}/website-projects)`,
    `- [Hosting only](${base}/build/hosting)`,
    `- [Our work](${base}/work)`,
    `- [Questions](${base}/faq)`,
    `- [Contact](${base}/contact)`,
    "",
  ].join("\n");
  return new Response(text, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
