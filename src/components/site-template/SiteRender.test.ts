import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { checkSite } from "@/lib/site-template/checks";
import { BARBER_PRESET } from "@/lib/site-template/presets";
import { SAMPLE_BARBER, SAMPLE_BARBER_FACTS } from "@/lib/site-template/sample";
import type { SiteContent } from "@/lib/site-template/schema";
import { SiteRender, safeImage } from "./SiteRender";

const render = (content: SiteContent, props: { heroImage?: string; enquiryAction?: string } = {}) =>
  renderToStaticMarkup(createElement(SiteRender, { content, ...props }));

describe("sample barber", () => {
  it("passes every check", () => {
    expect(checkSite(SAMPLE_BARBER, SAMPLE_BARBER_FACTS, BARBER_PRESET).issues).toEqual([]);
  });
});

describe("SiteRender", () => {
  it("renders every section's content", () => {
    const html = render(SAMPLE_BARBER, { heroImage: "/styler/barber-hero.webp" });
    for (const text of ["Sharp cuts on High Street", "Cut &amp; style", "£22", "Beard trim", "Mon to Fri", "Closed", "Find us", "Request a booking", "Ready for a fresh cut?"]) {
      expect(html).toContain(text);
    }
    expect(html).toContain('href="tel:01632960123"');
    expect(html).toContain('href="mailto:book@hartley.example"');
    expect(html).toContain('src="/styler/barber-hero.webp"');
  });

  it("sets the theme colour and a readable text colour on it", () => {
    expect(render(SAMPLE_BARBER)).toContain("--accent:#1f3a34;--on-accent:#ffffff");
    const pale = { ...SAMPLE_BARBER, theme: { ...SAMPLE_BARBER.theme, colour: "#f5e6a8" } };
    expect(render(pale)).toContain("--on-accent:#161616");
  });

  it("ignores a bad theme colour rather than passing it into CSS", () => {
    const bad = { ...SAMPLE_BARBER, theme: { colour: "red;background:url(x)", look: "classic" as const } };
    const html = render(bad);
    expect(html).not.toContain("url(x)");
    expect(html).toContain("--accent:#1a1a1a");
  });

  it("escapes text instead of treating it as HTML", () => {
    const c = structuredClone(SAMPLE_BARBER);
    c.sections[0] = { kind: "hero", variant: "plain", headline: "<img src=x onerror=alert(1)>", intro: "ok", cta: "Book" };
    const html = render(c);
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;img src=x");
  });

  it("shows only safe image addresses", () => {
    expect(safeImage("https://cdn.example/a.jpg")).toBe("https://cdn.example/a.jpg");
    expect(safeImage("/styler/a.webp")).toBe("/styler/a.webp");
    expect(safeImage("javascript:alert(1)")).toBeNull();
    expect(safeImage("//evil.example/a.jpg")).toBeNull();
    expect(safeImage("data:image/svg+xml,<svg>")).toBeNull();
    expect(safeImage(undefined)).toBeNull();
  });

  it("drops gallery images with unsafe addresses and hides an empty gallery", () => {
    const c = structuredClone(SAMPLE_BARBER);
    c.sections.splice(2, 0, { kind: "gallery", heading: "The shop", images: [{ src: "javascript:alert(1)", alt: "Bad" }] });
    expect(render(c)).not.toContain("The shop");
    c.sections[2] = { kind: "gallery", heading: "The shop", images: [{ src: "https://cdn.example/a.jpg", alt: "Chairs" }] };
    expect(render(c)).toContain('alt="Chairs"');
  });

  it("falls back to a plain hero without a photo", () => {
    expect(render(SAMPLE_BARBER)).toContain('data-variant="plain"');
  });

  it("only posts the enquiry form when given somewhere to post", () => {
    expect(render(SAMPLE_BARBER)).toContain('type="button"');
    const live = render(SAMPLE_BARBER, { enquiryAction: "/api/site-enquiry" });
    expect(live).toContain('action="/api/site-enquiry"');
    expect(live).toContain('type="submit"');
  });

  it("links the page's own sections from the nav", () => {
    const html = render(SAMPLE_BARBER);
    expect(html).toContain('href="#services"');
    expect(html).toContain('id="services"');
    expect(html).toContain('id="book"');
  });
});
