import { CARE_PLANS, ONE_OFF_WEBSITE, REFRESH, SUBSCRIPTION_TERMS, WEBSITE_PLANS, formatGBP } from "./pricing";

const { bronze: core, silver: pro, gold: plus } = WEBSITE_PLANS;

/**
 * Frequently asked questions. Answers state only what the site already commits to, with every figure taken from
 * lib/pricing. Cancellation, notice and transfer details point to the written agreement rather than inventing
 * terms: they are still being finalised (LEGAL_REVIEW_PENDING).
 * `short` is the answer at a glance, shown large on the card; it must say no more than `a`.
 */
export const FAQ_CATEGORIES = [
  { id: "getting-started", title: "Getting started" },
  { id: "pricing", title: "Pricing" },
  { id: "website", title: "Your website" },
  { id: "bookings", title: "Bookings and functionality" },
  { id: "hosting", title: "Hosting and maintenance" },
  { id: "ongoing", title: "Your subscription" },
] as const;

export type FaqCategory = (typeof FAQ_CATEGORIES)[number]["id"];

export const faqs: { q: string; short: string; a: string; category: FaqCategory }[] = [
  {
    q: "What is a managed website?",
    category: "getting-started",
    short: "We run it for you",
    a: "We design and build a bespoke website for your business, then host it, maintain it, keep it secure and backed up, and make changes for you, all for one monthly payment. You run your business; we run your website.",
  },
  {
    q: "What does each plan cost?",
    category: "pricing",
    short: `From ${formatGBP(core.monthly)} a month`,
    a: `${core.name} is ${formatGBP(core.monthly)} a month for a bespoke website of up to ${core.pages} pages. ${pro.name} is ${formatGBP(pro.monthly)} for up to ${pro.pages} pages and ${plus.name} is ${formatGBP(plus.monthly)} for up to ${plus.pages}. Every plan includes hosting, an SSL certificate, security monitoring, maintenance and support. ${pro.name} and ${plus.name} add search work, performance reporting, monthly time for changes and Winjo Refresh.`,
  },
  {
    q: "How do payments work?",
    category: "pricing",
    short: "Nothing until agreed",
    a: `A managed website is one payment a month, taken automatically, starting with your first month. A website project bought outright starts from ${formatGBP(ONE_OFF_WEBSITE.from)}, with the payment schedule set out in your proposal. Either way, nothing is charged until you agree to go ahead. WINJO DIGITAL is not VAT registered, so no VAT is added to our prices.`,
  },
  {
    q: "Is there a minimum contract?",
    category: "ongoing",
    short: "No",
    a: "No. Every plan is a rolling monthly subscription with no minimum contract term.",
  },
  {
    q: "What happens if I cancel?",
    category: "ongoing",
    short: "Your domain and content stay yours",
    a: `Give ${SUBSCRIPTION_TERMS.noticeDays} days' written notice, with no cancellation fee. We send you a copy of your content and design files within ${SUBSCRIPTION_TERMS.handoverDays} days, keep your website live for ${SUBSCRIPTION_TERMS.liveAfterEndDays} days so you can move it, and help point your domain to a new host at no charge. Your domain name is yours, and the code and framework we build on remain ours. The full steps are in our terms.`,
  },
  {
    q: "Who owns what?",
    category: "ongoing",
    short: "Domain and content: you",
    a: "You own your domain name and the business content you supply. Winjo keeps ownership of its own code and framework, subject to your agreed service terms. A website project bought outright is yours on full payment.",
  },
  {
    q: "What is Winjo Refresh?",
    category: "website",
    short: `A redesign every ${REFRESH.everyMonths} months`,
    a: `A planned refresh of your website's design and experience every ${REFRESH.everyMonths} months, included in ${pro.name} and ${plus.name}. It modernises how your website looks, improves how it works for visitors, and reflects changes in your business while staying true to your brand. It is a defined refresh service, not unlimited redevelopment or an unlimited number of new pages and features.`,
  },
  {
    q: "Is a managed website a template?",
    category: "website",
    short: "No, bespoke",
    a: "No. Every plan includes a website designed for your business. The plans differ in size, in how much we do each month and in the search work included, not in whether the design is your own.",
  },
  {
    q: "Can you guarantee I'll rank first on Google or appear in AI answers?",
    category: "website",
    short: "No, and nobody can",
    a: "No. We build and maintain your website so search engines, answer engines and AI tools can read and understand it properly, which gives it strong foundations. Nobody can honestly guarantee rankings, AI visibility or recommendations.",
  },
  {
    q: "Can I change plan later?",
    category: "ongoing",
    short: "Yes",
    a: "Yes. Tell us which plan you want. The new plan and price apply from your next monthly payment, and we don't charge or refund part of a month.",
  },
  {
    q: "How long does it take to launch?",
    category: "getting-started",
    short: "A date in writing",
    a: "It depends on the size of the website and what it needs to do. Once the scope is agreed, we confirm a delivery date in writing. We don't promise dates before that.",
  },
  {
    q: "What isn't included?",
    category: "pricing",
    short: "Listed on the pricing page",
    a: "Domain registration and renewal, business email, paid licences, third-party subscriptions and major new features are not part of any plan. Each is flagged up front, and the pricing page lists how they are handled.",
  },
  {
    q: "I'd rather buy my website outright. Can I?",
    category: "pricing",
    short: `Yes, from ${formatGBP(ONE_OFF_WEBSITE.from)}`,
    a: `Yes. A website project starts from ${formatGBP(ONE_OFF_WEBSITE.from)} and is yours on full payment. After launch you can host it yourself, or choose Hosting (${formatGBP(CARE_PLANS.hosting.monthly)} a month), Care (${formatGBP(CARE_PLANS.care.monthly)}) or Care Plus (${formatGBP(CARE_PLANS.carePlus.monthly)}).`,
  },
  {
    q: "Can you build an app or booking system for my business?",
    category: "website",
    short: "Yes",
    a: "Yes. Apps and booking systems are scoped individually: a conversation about how your business works, then a written scope, price and payment schedule for you to approve. We developed the driver and operator apps for EV Exec, and we run our own platform, FYStay.",
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
