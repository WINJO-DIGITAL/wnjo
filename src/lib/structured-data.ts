import { CARE_PLANS, ONE_OFF_TIERS, WEBSITE_PLANS } from "@/lib/pricing";
import { site } from "@/lib/site";

/**
 * The business, described for search engines using only what the site itself shows: name, description, the town in
 * the footer, and the published starting prices. No street address, phone number, ratings or reviews are included.
 */
export function businessSchema(baseUrl: string) {
  const url = baseUrl.replace(/\/+$/, "");
  return [
    {
      "@context": "https://schema.org",
      "@type": "ProfessionalService",
      "@id": `${url}/#business`,
      name: site.name,
      description: site.description,
      url,
      logo: `${url}/icon.png`,
      image: `${url}/opengraph-image.png`,
      address: { "@type": "PostalAddress", addressLocality: "Thornton-Cleveleys", addressRegion: "Lancashire", addressCountry: "GB" },
      areaServed: { "@type": "Country", name: "United Kingdom" },
      priceRange: `From £${WEBSITE_PLANS.bronze.monthly} a month`,
      knowsAbout: [
        "Managed websites",
        "Bespoke web design",
        "Website hosting and maintenance",
        "Search engine optimisation",
        "Answer engine optimisation",
        "Booking system development",
        "Custom software development",
      ],
      makesOffer: [
        ...(["bronze", "silver", "gold"] as const).map((id) => ({
          "@type": "Offer",
          name: `${WEBSITE_PLANS[id].name} managed website subscription`,
          description: WEBSITE_PLANS[id].tagline,
          priceSpecification: {
            "@type": "UnitPriceSpecification",
            price: WEBSITE_PLANS[id].monthly,
            priceCurrency: "GBP",
            unitText: "MONTH",
          },
        })),
        { "@type": "Offer", name: "Booking system development" },
        { "@type": "Offer", name: "Custom software and app development" },
        ...(["essential", "professional", "premium"] as const).map((id) => ({
          "@type": "Offer",
          name: `${ONE_OFF_TIERS[id].name} bespoke website, bought outright`,
          description: `${ONE_OFF_TIERS[id].summary} Up to ${ONE_OFF_TIERS[id].pageLimit} pages.`,
          priceSpecification: { "@type": "PriceSpecification", price: ONE_OFF_TIERS[id].from, minPrice: ONE_OFF_TIERS[id].from, priceCurrency: "GBP" },
        })),
        {
          "@type": "Offer",
          name: "Managed hosting",
          priceSpecification: {
            "@type": "UnitPriceSpecification",
            price: CARE_PLANS.hosting.monthly,
            priceCurrency: "GBP",
            unitText: "MONTH",
          },
        },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${url}/#website`,
      name: site.name,
      url,
      publisher: { "@id": `${url}/#business` },
    },
  ];
}

/** The questions page as FAQPage data, so search and answer engines can quote each answer with its question. */
export function faqSchema(items: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
}
