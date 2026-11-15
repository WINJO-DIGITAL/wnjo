import { CARE_PLANS, ONE_OFF_TIERS, REFRESH, WEBSITE_PLANS } from "@/lib/pricing";
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

export type ServicePage = "managed-websites" | "website-projects" | "booking-software" | "app-development" | "winjo-refresh";

const monthlyOffer = (name: string, price: number, description?: string) => ({
  "@type": "Offer",
  name,
  ...(description && { description }),
  priceSpecification: { "@type": "UnitPriceSpecification", price, priceCurrency: "GBP", unitText: "MONTH" },
});

const fromOffer = (name: string, from: number, description?: string) => ({
  "@type": "Offer",
  name,
  ...(description && { description }),
  priceSpecification: { "@type": "PriceSpecification", price: from, minPrice: from, priceCurrency: "GBP" },
});

/**
 * One service page, described for search engines with the prices the site publishes for it. Each is tied to the
 * business on the home page by its @id. Booking systems and software are quoted per project, so they carry no price,
 * as on the home page. WINJO Refresh has no price of its own: it lists the plans that include it.
 */
export function serviceSchema(baseUrl: string, page: ServicePage) {
  const url = baseUrl.replace(/\/+$/, "");
  const plans = (ids: readonly ("bronze" | "silver" | "gold")[]) =>
    ids.map((id) => monthlyOffer(`${WEBSITE_PLANS[id].name} managed website subscription`, WEBSITE_PLANS[id].monthly, WEBSITE_PLANS[id].tagline));
  const services: Record<ServicePage, { name: string; serviceType: string; description: string; offers: object[] }> = {
    "managed-websites": {
      name: "Managed websites",
      serviceType: "Managed website design, hosting and maintenance",
      description: "A bespoke website designed, hosted, maintained and updated for one monthly payment, with no minimum term.",
      offers: plans(["bronze", "silver", "gold"]),
    },
    "website-projects": {
      name: "Bespoke website design",
      serviceType: "Website design and build",
      description: "A bespoke website paid for up front and owned by the customer on full payment, with optional hosting and care.",
      offers: (["essential", "professional", "premium"] as const).map((id) =>
        fromOffer(`${ONE_OFF_TIERS[id].name} bespoke website, bought outright`, ONE_OFF_TIERS[id].from, `${ONE_OFF_TIERS[id].summary} Up to ${ONE_OFF_TIERS[id].pageLimit} pages.`),
      ),
    },
    "booking-software": {
      name: "Booking system development",
      serviceType: "Booking software development",
      description: "A bespoke booking system with payments, the customer's branding and an operator app.",
      offers: [],
    },
    "app-development": {
      name: "Custom software and app development",
      serviceType: "Custom software development",
      description: "Web and mobile apps, customer portals, platforms, internal tools and integrations, built around the way a business operates.",
      offers: [],
    },
    "winjo-refresh": {
      name: "WINJO Refresh",
      serviceType: "Website redesign",
      description: `A planned website design and experience refresh every ${REFRESH.everyMonths} months, included in the ${WEBSITE_PLANS.silver.name} and ${WEBSITE_PLANS.gold.name} managed website plans.`,
      offers: plans(["silver", "gold"]),
    },
  };
  const service = services[page];
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${url}/${page}#service`,
    name: service.name,
    serviceType: service.serviceType,
    description: service.description,
    url: `${url}/${page}`,
    provider: { "@id": `${url}/#business` },
    areaServed: { "@type": "Country", name: "United Kingdom" },
    ...(service.offers.length > 0 && { offers: service.offers }),
  };
}
