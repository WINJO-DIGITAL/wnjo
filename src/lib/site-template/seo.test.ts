import { describe, expect, it } from "vitest";
import { SAMPLE_BARBER, SAMPLE_ELECTRICIAN } from "./sample";
import type { SiteContent } from "./schema";
import { daysFrom, jsonLdText, localBusinessJsonLd, pageDescription, pageMetaDescription, pagesOf, pageTitle, robotsTxt, sitemapXml } from "./seo";

const multi: SiteContent = {
  ...SAMPLE_BARBER,
  pages: [
    { slug: "services", title: "Services", sections: [{ kind: "pagehead", headline: "Cuts and prices", intro: "Every cut, with its price." }] },
    { slug: "contact", title: "Contact", sections: [{ kind: "pagehead", headline: "Get in touch", intro: "Tell us what you need." }] },
  ],
};

describe("page titles and descriptions", () => {
  it("names the home page by the business, and other pages by their own title first", () => {
    expect(pageTitle(multi, "")).toContain("Hartley & Sons");
    expect(pageTitle(multi, "services")).toBe("Services | Hartley & Sons");
  });
  it("keeps the home title short enough to show in full, dropping the tagline if needed", () => {
    const long = { ...SAMPLE_BARBER, business: { ...SAMPLE_BARBER.business, tagline: "x".repeat(80) } };
    expect(pageTitle(long, "")).toBe(SAMPLE_BARBER.business.name);
  });
  it("describes a page from its own opening words, within 160 characters", () => {
    expect(pageDescription(multi, "services")).toBe("Every cut, with its price.");
    expect(pageDescription(multi, "").length).toBeGreaterThan(0);
    const long: SiteContent = { ...multi, pages: [{ slug: "services", title: "Services", sections: [{ kind: "pagehead", headline: "H", intro: "word ".repeat(100) }] }] };
    expect(pageDescription(long, "services").length).toBeLessThanOrEqual(160);
  });
  it("keeps each page's meta description distinct when the opening words match", () => {
    const shared = "Tell us what you need.";
    const clash: SiteContent = {
      ...multi,
      sections: [{ kind: "hero", variant: "plain", headline: "Hello", intro: shared, cta: "Book" }],
      pages: [
        { slug: "contact", title: "Contact", sections: [{ kind: "pagehead", headline: "Get in touch", intro: shared }] },
      ],
    };
    expect(pageMetaDescription(clash, "")).not.toBe(pageMetaDescription(clash, "contact"));
    expect(pageMetaDescription(multi, "services")).toBe("Every cut, with its price.");
  });
});

describe("opening days", () => {
  it("reads ranges and lists", () => {
    expect(daysFrom("Mon to Fri")).toEqual(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]);
    expect(daysFrom("Sat, Sun")).toEqual(["Saturday", "Sunday"]);
    expect(daysFrom("Sat")).toEqual(["Saturday"]);
  });
  it("gives nothing for something it doesn't understand, rather than guessing", () => {
    expect(daysFrom("Bank holidays")).toEqual([]);
    expect(daysFrom("Fri to Mon")).toEqual([]);
    expect(daysFrom("")).toEqual([]);
  });
});

describe("structured data", () => {
  it("states only what the customer gave", () => {
    const data = localBusinessJsonLd(SAMPLE_BARBER, "https://hartley.example/");
    expect(data["@type"]).toBe("LocalBusiness");
    expect(data.name).toBe("Hartley & Sons");
    expect(data.telephone).toBe("01632 960123");
    expect(data.address).toMatchObject({ streetAddress: "12 High Street, Leeds" });
    expect(JSON.stringify(data)).toContain("Monday");
    expect(data.areaServed).toEqual([{ "@type": "AdministrativeArea", name: "Leeds" }]);
    const linked = localBusinessJsonLd(
      { ...SAMPLE_BARBER, business: { ...SAMPLE_BARBER.business, areas: ["Leeds", "Bradford"], sameAs: ["https://example.com/hartley", "javascript:alert(1)"], googleProfile: "https://maps.google.com/?cid=1" } },
      "https://hartley.example/",
    );
    expect(linked.areaServed).toEqual([{ "@type": "AdministrativeArea", name: "Leeds" }, { "@type": "AdministrativeArea", name: "Bradford" }]);
    expect(linked.sameAs).toEqual(["https://example.com/hartley"]);
    // The electrician gave no hours, so none are claimed.
    expect(localBusinessJsonLd(SAMPLE_ELECTRICIAN, "https://spark.example/")).not.toHaveProperty("openingHoursSpecification");
  });
  it("leaves out a closed day", () => {
    const text = JSON.stringify(localBusinessJsonLd(SAMPLE_BARBER, "https://x.example/"));
    expect(text).not.toContain("Sunday");
  });
  it("escapes anything that could close the script block", () => {
    const evil = { ...SAMPLE_BARBER, business: { ...SAMPLE_BARBER.business, name: "</script><script>alert(1)</script>" } };
    const text = jsonLdText(localBusinessJsonLd(evil, "https://x.example/"));
    expect(text).not.toContain("</script>");
    expect(JSON.parse(text).name).toBe("</script><script>alert(1)</script>");
  });
});

describe("sitemap and robots", () => {
  it("lists every page at its own address", () => {
    const xml = sitemapXml("https://hartley.example", multi, "2026-11-14T10:00:00Z");
    for (const loc of ["https://hartley.example/", "https://hartley.example/services", "https://hartley.example/contact"]) expect(xml).toContain(`<loc>${loc}</loc>`);
    expect(xml).toContain("<lastmod>2026-11-14</lastmod>");
    expect(pagesOf(multi).map((p) => p.slug)).toEqual(["", "services", "contact"]);
  });
  it("escapes the address", () => {
    expect(sitemapXml("https://a.example/?x=1&y=2", SAMPLE_BARBER)).toContain("&amp;");
  });
  it("lets everything be read and names the sitemap", () => {
    expect(robotsTxt("https://hartley.example")).toBe("User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: https://hartley.example/sitemap.xml\n");
  });
});
