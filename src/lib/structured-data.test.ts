import { describe, expect, it } from "vitest";
import { businessSchema } from "@/lib/structured-data";

describe("businessSchema", () => {
  const [business, website] = businessSchema("https://winjodigital.co.uk/");

  it("describes the business with the published starting prices", () => {
    expect(business["@type"]).toBe("ProfessionalService");
    expect(business.url).toBe("https://winjodigital.co.uk");
    expect(business.priceRange).toBe("From £1,800");
    expect(business.makesOffer?.map((o) => o.priceSpecification.price)).toEqual([1800, 25]);
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
