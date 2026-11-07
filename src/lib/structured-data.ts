import { CARE_PLANS, PACKAGES } from "@/lib/pricing";
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
      priceRange: `From £${PACKAGES.essential.from.toLocaleString("en-GB")}`,
      makesOffer: [
        {
          "@type": "Offer",
          name: "Website design and build",
          priceSpecification: { "@type": "PriceSpecification", price: PACKAGES.essential.from, minPrice: PACKAGES.essential.from, priceCurrency: "GBP" },
        },
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
