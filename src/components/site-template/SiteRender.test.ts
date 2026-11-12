import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { checkSite } from "@/lib/site-template/checks";
import { BARBER_PRESET } from "@/lib/site-template/presets";
import { SAMPLE_BARBER, SAMPLE_BARBER_FACTS, SAMPLE_CAFE, SAMPLE_ELECTRICIAN } from "@/lib/site-template/sample";
import type { SiteContent } from "@/lib/site-template/schema";
import { SiteRender, safeImage, type EnquiryProps } from "./SiteRender";

const render = (content: SiteContent, props: { heroImage?: string; enquiry?: EnquiryProps } = {}) =>
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

  it("is inactive in a preview: no action, a button that submits nothing", () => {
    const html = render(SAMPLE_BARBER);
    expect(html).toContain('type="button"');
    expect(html).not.toContain("action=");
    expect(html).not.toContain('name="token"');
  });

  it("posts to the enquiry route when the build is live, with its token and a bot trap", () => {
    const html = render(SAMPLE_BARBER, { enquiry: { action: "/api/site-enquiry", token: "tok123" } });
    expect(html).toContain('action="/api/site-enquiry"');
    expect(html).toContain('method="post"');
    expect(html).toContain('name="token" value="tok123"');
    expect(html).toContain('name="website"');
    expect(html).toContain('type="submit"');
  });

  it("shows a confirmation instead of the form once a request is sent, and an error message when it fails", () => {
    const sent = render(SAMPLE_BARBER, { enquiry: { action: "/api/site-enquiry", token: "t", state: "sent" } });
    expect(sent).toContain("Request sent");
    expect(sent).toContain("Hartley &amp; Sons has your request");
    expect(sent).not.toContain("<form");
    const failed = render(SAMPLE_BARBER, { enquiry: { action: "/api/site-enquiry", token: "t", state: "error" } });
    expect(failed).toContain("That didn&#x27;t send");
    expect(failed).toContain("<form");
  });

  it("links the page's own sections from the nav", () => {
    const html = render(SAMPLE_BARBER);
    expect(html).toContain('href="#services"');
    expect(html).toContain('id="services"');
    expect(html).toContain('id="book"');
  });
});

describe("SiteRender for the other sectors", () => {
  it("shows a Call button in the hero when there is a phone number, and not without one", () => {
    expect(render(SAMPLE_ELECTRICIAN)).toContain('href="tel:01134960789"');
    expect(render(SAMPLE_ELECTRICIAN)).toContain("Call 0113 496 0789");
    const noPhone = structuredClone(SAMPLE_ELECTRICIAN);
    noPhone.business.phone = undefined;
    expect(render(noPhone)).not.toContain("Call ");
  });

  it("names nav links from the section's own heading, and labels the request box for the sector", () => {
    const cafe = render(SAMPLE_CAFE);
    expect(cafe).toContain('href="#services">Menu</a>');
    expect(cafe).toContain("Date, time and how many of you?");
    expect(render(SAMPLE_ELECTRICIAN)).toContain("What do you need doing?");
    expect(render(SAMPLE_ELECTRICIAN)).toContain("Areas we cover");
  });

  it("has no hours section for a trade that gave none", () => {
    expect(render(SAMPLE_ELECTRICIAN)).not.toContain('id="hours"');
  });

  it("falls back to a plain word when a heading is too long for the nav", () => {
    const c = structuredClone(SAMPLE_CAFE);
    c.sections[1] = { kind: "services", heading: "Everything we bake and brew every day", items: [{ name: "Flat white", price: "£3.20" }] };
    expect(render(c)).toContain('href="#services">Services</a>');
  });
});
