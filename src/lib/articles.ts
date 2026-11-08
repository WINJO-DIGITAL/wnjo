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
    description: "Each step from first enquiry to launch: the written price, the 50% deposit, review, the final payment and support after launch.",
    published: "2026-11-07",
    sections: [
      {
        heading: "1. Get a price",
        paragraphs: [
          "Answer a few questions about your business in the price calculator, or send us a message. Websites start from £1,800 for the Essential package.",
          "Your written quote arrives instantly, by email and in your account. Nothing is charged at this stage.",
        ],
      },
      {
        heading: "2. Accept the quote and pay the deposit",
        paragraphs: [
          "When you accept, you pay a 50% deposit. Work starts once it has cleared. WINJO DIGITAL is not VAT registered, so no VAT is added.",
        ],
      },
      {
        heading: "3. Design and build",
        paragraphs: [
          "We design the site around your business and build it for phones first. Your package sets the number of design revisions: two rounds for Essential and three for Professional.",
          "You can follow progress in your account, where each stage and update is posted as it happens.",
        ],
      },
      {
        heading: "4. Review, then the final payment",
        paragraphs: [
          "When the site is ready, you review the finished work. The remaining 50% is paid once you are happy, before the site goes live.",
          "Until then the site is shown to you for review only. The finished site, its files and copyright pass to you on full payment.",
        ],
      },
      {
        heading: "5. Launch and support",
        paragraphs: [
          "After launch, Essential and Professional include 30 days of handover support, and Premium includes 60.",
          "After that, you can host the site yourself, or choose managed hosting from £25 a month, which covers hosting, the SSL certificate, daily backups and uptime monitoring.",
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
