import { CARE_PLANS, ONE_OFF_WEBSITE, OWNERSHIP, WEBSITE_PLANS, formatGBP } from "./pricing";

/**
 * Frequently asked questions. Answers state only what the site already commits to, with every figure taken from
 * lib/pricing. Ownership, cancellation and transfer details point to the written agreement rather than inventing
 * terms: they are awaiting legal review (LEGAL_REVIEW_PENDING).
 * `short` is the answer at a glance, shown large on the card; it must say no more than `a`.
 */
export const FAQ_CATEGORIES = [
  { id: "getting-started", title: "Getting started" },
  { id: "pricing", title: "Pricing" },
  { id: "website", title: "Website design and development" },
  { id: "bookings", title: "Bookings and functionality" },
  { id: "hosting", title: "Hosting and maintenance" },
  { id: "ongoing", title: "Ongoing support" },
] as const;

export type FaqCategory = (typeof FAQ_CATEGORIES)[number]["id"];

export const faqs: { q: string; short: string; a: string; category: FaqCategory }[] = [
  {
    q: "What's included in a monthly website package?",
    category: "pricing",
    short: "Hosting and support in",
    a: `A bespoke website with hosting, an SSL certificate, security updates, technical maintenance and support, for one monthly price. Core is ${formatGBP(WEBSITE_PLANS.bronze.monthly)} a month for up to ${WEBSITE_PLANS.bronze.pages} pages, Plus ${formatGBP(WEBSITE_PLANS.silver.monthly)} for up to ${WEBSITE_PLANS.silver.pages}, and Pro ${formatGBP(WEBSITE_PLANS.gold.monthly)} for up to ${WEBSITE_PLANS.gold.pages}, each with a one-off setup fee. Plus and Pro also include monthly content updates.`,
  },
  {
    q: "Is a monthly website a template?",
    category: "website",
    short: "No, bespoke",
    a: "No. Every package is designed for your business. The packages differ in pages, features and the depth of design, not in whether the design is your own.",
  },
  {
    q: "How do payments work?",
    category: "pricing",
    short: "Nothing until agreed",
    a: `On a monthly package, the first payment is the setup fee plus your first month, then one payment a month. A one-off website starts from ${formatGBP(ONE_OFF_WEBSITE.from)}, with the payment schedule set out in your proposal. Either way, nothing is charged until you accept a written proposal. WINJO DIGITAL is not VAT registered, so no VAT is added to our prices.`,
  },
  {
    q: "When do I own my website?",
    category: "website",
    short: `After ${OWNERSHIP.ownershipAfterPayments} payments`,
    a: `On a monthly package, ownership of your agreed website deliverables transfers to you after ${OWNERSHIP.ownershipAfterPayments} successful monthly payments. A one-off website is yours on full payment. Your domain is registered in your name. Third-party licences and subscriptions stay under their own terms, and our own reusable tools and frameworks are not transferred automatically. The details are confirmed in your written agreement.`,
  },
  {
    q: "What happens after the first 12 months?",
    category: "ongoing",
    short: "Month to month",
    a: `Your subscription continues month to month, with hosting, maintenance and support as before. You can also ask us to transfer the website to you under the transfer policy, with ${OWNERSHIP.noticeDays} days' notice.`,
  },
  {
    q: "Can I cancel during the first 12 months?",
    category: "pricing",
    short: `${OWNERSHIP.minimumTermMonths}-month minimum`,
    a: `Monthly packages have a ${OWNERSHIP.minimumTermMonths}-month minimum term. What happens if you need to end it early is set out in your written agreement before you sign up.`,
  },
  {
    q: "How long does a project take?",
    category: "getting-started",
    short: "A date in writing",
    a: "It depends on the size of the site and the features it needs: a three-page website is a much smaller job than a web application. Once the scope is agreed, we confirm a delivery date in writing. We don't promise dates before that.",
  },
  {
    q: "How many revisions are included?",
    category: "website",
    short: "Set in your proposal",
    a: "Your written proposal sets out the review rounds for your website. Bigger changes of direction are discussed, and quoted, before any extra work.",
  },
  {
    q: "What happens after launch?",
    category: "ongoing",
    short: "Support continues",
    a: `Monthly packages include hosting, maintenance and support for as long as you subscribe. A one-off website includes launch support; after that you can host it yourself, or choose Hosting (${formatGBP(CARE_PLANS.hosting.monthly)} a month), Care (${formatGBP(CARE_PLANS.care.monthly)}) or Care Plus (${formatGBP(CARE_PLANS.carePlus.monthly)}).`,
  },
  {
    q: "Can you build an app for my business?",
    category: "website",
    short: "Yes",
    a: "Yes. Apps are scoped individually: a conversation about how your business works, then a written scope, price and payment schedule for you to approve. We developed the driver and operator apps for EV Exec, and we run our own platform, FYStay.",
  },
  {
    q: "Can you add features to my site later?",
    category: "ongoing",
    short: "Yes",
    a: "Yes. Add-on features have published prices on the pricing page. Larger improvements are quoted as separate work, or covered by the monthly content allowance in Plus and Pro, or the hours in Care Plus.",
  },
];

/** Questions in each category, in the order the categories are listed. Empty categories are left out. */
export function groupFaqs(items: typeof faqs = faqs) {
  return FAQ_CATEGORIES.map((cat) => ({
    ...cat,
    items: items.filter((item) => item.category === cat.id),
  })).filter((group) => group.items.length > 0);
}

/** Whether a question matches a search. Every word typed must appear somewhere in the question or its answers. */
export function matchesFaq(item: (typeof faqs)[number], query: string): boolean {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = `${item.q} ${item.short} ${item.a}`.toLowerCase();
  return words.every((word) => haystack.includes(word));
}
