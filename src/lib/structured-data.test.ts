import { describe, expect, it } from "vitest";
import { businessSchema } from "@/lib/structured-data";

describe("businessSchema", () => {
  const [business, website] = businessSchema("https://winjodigital.co.uk/");

  it("describes the business with the published starting prices", () => {
    expect(business["@type"]).toBe("ProfessionalService");
    expect(business.url).toBe("https://winjodigital.co.uk");
    expect(business.priceRange).toBe("From £99 a month");
    const offers = business.makesOffer ?? [];
    expect(offers.flatMap((o) => (o.priceSpecification ? [o.priceSpecification.price] : []))).toEqual([99, 149, 199, 999, 1999, 2999, 49]);
    expect(offers.slice(0, 3).map((o) => o.name)).toEqual([
      "Core managed website subscription",
      "Plus managed website subscription",
      "Pro managed website subscription",
    ]);
    // Services without a published price are listed by name only.
    expect(offers.filter((o) => !o.priceSpecification).map((o) => o.name)).toEqual([
      "Booking system development",
      "Custom software and app development",
    ]);
  });

  it("gives only the town, not a street address or phone number", () => {
    expect(business.address).toEqual({ "@type": "PostalAddress", addressLocality: "Thornton-Cleveleys", addressRegion: "Lancashire", addressCountry: "GB" });
    expect(JSON.stringify(business)).not.toMatch(/Knoxwood|telephone|07474/);
  });

  it("claims no ratings or reviews", () => {
    expect(JSON.stringify(business)).not.toMatch(/aggregateRating|review/i);
  });

  it("links the website to the business", () => {
    expect(website.publisher).toEqual({ "@id": "https://winjodigital.co.uk/#business" });
  });
});

describe("faqSchema", () => {
  it("pairs each question with its answer as FAQPage data", async () => {
    const { faqSchema } = await import("./structured-data");
    const schema = faqSchema([{ q: "What does Core cost?", a: "£99 a month." }]);
    expect(schema["@type"]).toBe("FAQPage");
    expect(schema.mainEntity).toEqual([{ "@type": "Question", name: "What does Core cost?", acceptedAnswer: { "@type": "Answer", text: "£99 a month." } }]);
  });
});

describe("serviceSchema", () => {
  it("describes each service page and ties it to the business", async () => {
    const { serviceSchema } = await import("./structured-data");
    for (const page of ["managed-websites", "website-projects", "booking-software", "app-development", "winjo-refresh"] as const) {
      const schema = serviceSchema("https://winjodigital.co.uk/", page);
      expect(schema["@type"]).toBe("Service");
      expect(schema.url).toBe(`https://winjodigital.co.uk/${page}`);
      expect(schema.provider).toEqual({ "@id": "https://winjodigital.co.uk/#business" });
      expect(JSON.stringify(schema)).not.toMatch(/aggregateRating|review/i);
    }
  });

  it("uses the published plan prices, and no price for work quoted per project", async () => {
    const { serviceSchema } = await import("./structured-data");
    const { WEBSITE_PLANS, ONE_OFF_TIERS } = await import("./pricing");
    const prices = (page: Parameters<typeof serviceSchema>[1]) =>
      ((serviceSchema("https://winjodigital.co.uk", page) as { offers?: { priceSpecification: { price: number } }[] }).offers ?? []).map((o) => o.priceSpecification.price);
    expect(prices("managed-websites")).toEqual([WEBSITE_PLANS.bronze.monthly, WEBSITE_PLANS.silver.monthly, WEBSITE_PLANS.gold.monthly]);
    expect(prices("website-projects")).toEqual([ONE_OFF_TIERS.essential.from, ONE_OFF_TIERS.professional.from, ONE_OFF_TIERS.premium.from]);
    expect(prices("winjo-refresh")).toEqual([WEBSITE_PLANS.bronze.monthly, WEBSITE_PLANS.silver.monthly, WEBSITE_PLANS.gold.monthly]);
    expect(prices("booking-software")).toEqual([]);
    expect(prices("app-development")).toEqual([]);
  });
});
