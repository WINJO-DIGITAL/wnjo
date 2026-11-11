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
    description: "Each step from choosing a plan to launch for a managed website, and how owning your website outright differs: the first payment, your goals, design and build, launch and ongoing care.",
    published: "2026-11-07",
    sections: [
      {
        heading: "Choose a plan and pay your first month",
        paragraphs: [
          "Pick a plan on the pricing page and enter your name and email. Managed websites start from £99 a month, with no minimum term.",
          "You pay your first month securely through Stripe. WINJO DIGITAL is not VAT registered, so no VAT is added.",
        ],
      },
      {
        heading: "Tell us about your website",
        paragraphs: [
          "Sign in to your account with the email you ordered with and tell us your goals, the pages you need and the style you like. It takes a few minutes, and you can add files too.",
          "We start designing as soon as we have them.",
        ],
      },
      {
        heading: "Design, build and review",
        paragraphs: [
          "We design the site around your business and build it for phones first. You can follow progress in your account, where each stage and update is posted as it happens.",
          "When a preview is ready, you look it over and tell us what to change before anything goes live.",
        ],
      },
      {
        heading: "Launch and ongoing care",
        paragraphs: [
          "Managed websites include hosting, maintenance and support for as long as you subscribe, on a rolling monthly subscription with no minimum term. Your domain name and the content you supply are always yours.",
        ],
      },
      {
        heading: "If you would rather own your website",
        paragraphs: [
          "Choose Own your website and answer a few questions. We send a written proposal within one working day, and nothing is charged until you accept it. A 50% deposit then starts the build, and the website is yours on full payment. Website projects start from £999.",
          "A website project includes launch support. After that, you can host it yourself, or choose managed hosting from £49 a month, which covers hosting, the SSL certificate, uptime monitoring, security updates and technical support.",
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
