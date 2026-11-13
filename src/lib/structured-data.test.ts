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
