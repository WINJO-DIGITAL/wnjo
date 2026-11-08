/**
 * Resources: practical articles for small businesses. Each one states only what WINJO DIGITAL actually does, as set out on the
 * pricing page and in the terms. Add articles here; the index, article pages, breadcrumbs and sitemap pick them up.
 */
export type Article = {
  slug: string;
  title: string;
  description: string;
  /** ISO date the article was first published. */
  published: string;
  sections: { heading: string; paragraphs: string[] }[];
};

export const articles: Article[] = [
  {
    slug: "how-ordering-a-website-works",
    title: "What happens when you order a website from WINJO DIGITAL",
    description: "Each step from first enquiry to launch, for a monthly website package or a one-off bespoke website: the quote, the first payment, design and build, launch and support.",
    published: "2026-11-07",
    sections: [
      {
        heading: "1. Get a price",
        paragraphs: [
          "Build your quote in the price calculator, or send us a message. Monthly websites start from £99 a month with a £99 setup fee, and one-off bespoke websites from £999.",
          "You see your first payment and monthly price as you choose, and we follow up with a written proposal. Nothing is charged at this stage.",
        ],
      },
      {
        heading: "2. Accept your proposal and make the first payment",
        paragraphs: [
          "On a monthly package, the first payment is the setup fee plus your first month. For a one-off website, the payment schedule is set out in your proposal. Work starts once the first payment has cleared. WINJO DIGITAL is not VAT registered, so no VAT is added.",
        ],
      },
      {
        heading: "3. Design and build",
        paragraphs: [
          "We design the site around your business and build it for phones first. Your written proposal sets the number of design review rounds.",
          "You can follow progress in your account, where each stage and update is posted as it happens.",
        ],
      },
      {
        heading: "4. Review and launch",
        paragraphs: [
          "When the site is ready, you review the finished work before it goes live.",
          "A one-off website is yours on full payment. On a monthly package, ownership of your agreed website passes to you after 12 successful monthly payments, as set out in your agreement.",
        ],
      },
      {
        heading: "5. Launch and support",
        paragraphs: [
          "Monthly packages include hosting, maintenance and support for as long as you subscribe.",
          "A one-off website includes launch support. After that, you can host it yourself, or choose managed hosting from £49 a month, which covers hosting, the SSL certificate, daily backups, uptime monitoring, security updates and technical support.",
        ],
      },
    ],
  },
];

export const articleBySlug = (slug: string) => articles.find((a) => a.slug === slug);

/** Breadcrumb names for each article page. */
export const articleLabels: Record<string, string> = Object.fromEntries(
  articles.map((a) => [`/resources/${a.slug}`, a.title]),
);
