import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { checkSite } from "@/lib/site-template/checks";
import { firstPages } from "@/lib/site-template/pages";
import { assembleSite, defaultCopy } from "@/lib/site-template/write";
import { BARBER_PRESET, SECTOR_PRESETS } from "@/lib/site-template/presets";
import { SAMPLES, SAMPLE_BARBER, SAMPLE_BARBER_FACTS, SAMPLE_CAFE, SAMPLE_ELECTRICIAN } from "@/lib/site-template/sample";
import { defaultLayout, LAYOUTS, type SiteContent } from "@/lib/site-template/schema";
import { arrange, SiteRender, safeImage, safeVideo, type EnquiryProps } from "./SiteRender";

const render = (content: SiteContent, props: { heroImage?: string; heroVideo?: string; enquiry?: EnquiryProps } = {}) =>
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

  it("hides WhatsApp, reviews and the map until the customer has supplied them", () => {
    const html = render(SAMPLE_BARBER);
    expect(html).not.toContain("WhatsApp");
    expect(html).not.toContain(">Reviews<");
    expect(html).toContain("maps.google.com/maps?q=");
    const withExtras = {
      ...SAMPLE_BARBER,
      business: { ...SAMPLE_BARBER.business, whatsapp: "07700 900123", googleProfile: "https://maps.google.com/?cid=1" },
      reviews: [{ quote: "A tidy cut.", name: "Sam", source: "Google" }],
    };
    const extra = render(withExtras);
    expect(extra).toContain("https://wa.me/447700900123");
    expect(extra).toContain("A tidy cut.");
    expect(extra).toContain("Google Business Profile");
    expect(extra).toContain(">Service<");
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

describe("layouts", () => {
  const withGallery: SiteContent["sections"] = [
    ...SAMPLE_ELECTRICIAN.sections.filter((s) => s.kind !== "gallery" && s.kind !== "facts"),
    { kind: "gallery", heading: "Our work", images: [{ src: "/styler/trades-fuse.webp", alt: "A fuse board" }] },
    { kind: "facts", items: [{ value: "Free", label: "Quotes" }] },
  ];
  const kinds = (layout: Parameters<typeof arrange>[1]) => arrange(withGallery, layout).map((s) => s.kind);
  const original = withGallery.map((s) => s.kind);

  it("brings the photos up for a picture-led layout, and the facts and price list up for an information-led one", () => {
    expect(kinds("showcase").slice(0, 2)).toEqual(["hero", "gallery"]);
    expect(kinds("essentials").slice(0, 3)).toEqual(["hero", "facts", "services"]);
    expect(kinds("split")).toEqual(original);
  });
  it("only reorders: nothing is added or dropped", () => {
    for (const l of LAYOUTS) expect([...kinds(l)].sort()).toEqual([...original].sort());
  });
  it("gives every sector a layout of its own to start on, and falls back for an unknown one", () => {
    for (const id of Object.keys(SECTOR_PRESETS)) expect(LAYOUTS).toContain(defaultLayout(id));
    expect(defaultLayout("barber")).toBe("showcase");
    expect(defaultLayout("plumbing")).toBe("essentials");
    expect(defaultLayout("nope")).toBe("showcase");
  });
});

describe("stand-in photos", () => {
  it("has a photo set on disk for every template", async () => {
    const { existsSync, readFileSync } = await import("node:fs");
    const source = readFileSync("src/lib/site-template/template-test.ts", "utf8");
    const paths = source.match(/\/styler\/[a-z0-9-]+\.webp/g) ?? [];
    expect(paths.length).toBeGreaterThanOrEqual(Object.keys(SECTOR_PRESETS).length * 4);
    for (const p of paths) expect(existsSync(`public${p}`), p).toBe(true);
  });
});

describe("the header logo and the request form's page", () => {
  it("shows the logo in the header with the business name as its text, and the name alone without one", () => {
    const withLogo = { ...SAMPLE_BARBER, business: { ...SAMPLE_BARBER.business, logo: "https://cdn.example/logo.svg" } };
    expect(render(withLogo)).toContain('src="https://cdn.example/logo.svg"');
    expect(render(withLogo)).toContain('alt="Hartley &amp; Sons"');
    expect(render(SAMPLE_BARBER)).not.toContain("logo.svg");
  });
  it("never shows a logo from an unsafe address", () => {
    const bad = { ...SAMPLE_BARBER, business: { ...SAMPLE_BARBER.business, logo: "javascript:alert(1)" } };
    expect(render(bad)).not.toContain("javascript:");
  });
  it("tells the request route which page the form is on", () => {
    const html = renderToStaticMarkup(createElement(SiteRender, { content: SAMPLE_BARBER, enquiry: { action: "/api/site-enquiry", token: "tok123" }, page: "" }));
    expect(html).toContain('name="page" value=""');
  });
});

describe("inner pages", () => {
  const photos = [
    { src: "/styler/a.webp", alt: "Two barbers at work" },
    { src: "/styler/b.webp", alt: "Hartley & Sons photo 2" },
    { src: "/styler/c.webp", alt: "" },
  ];
  const site = () => {
    const input = { preset: BARBER_PRESET, facts: SAMPLES.barber.facts, look: "classic" as const, colour: "#1f3a34", pages: firstPages(6), pageLimit: 6, images: photos };
    const copy = { ...defaultCopy(input), faq: [{ question: "Do you take walk-ins?", answer: "Yes, walk-ins are welcome." }] };
    return assembleSite(input, copy);
  };
  const page = (slug: string, content = site()) => renderToStaticMarkup(createElement(SiteRender, { content, page: slug, pageHref: (s) => `/${s}` }));

  it("puts a photo beside the About text", () => {
    const html = page("about");
    expect(html).toContain('src="/styler/a.webp"');
    expect(html).toContain('alt="Two barbers at work"');
    expect(html).toContain("data-photo");
  });
  it("shows the Gallery page as a wall, captioning only photos the customer described", () => {
    const html = page("gallery");
    expect(html).toContain("<figure");
    expect(html).toContain("<figcaption>Two barbers at work</figcaption>");
    // A description that is only the business's own name and a number isn't a caption.
    expect(html).not.toContain("<figcaption>Hartley &amp; Sons photo 2</figcaption>");
  });
  it("ends the FAQs page with the customer's own phone and the request form, and nothing else", () => {
    const html = page("faq");
    expect(html).toContain("Can&#x27;t see your answer?");
    expect(html).toContain('href="tel:01632960123"');
    expect(html).toContain("send a request");
    // With no phone and no request form anywhere on the site there is nowhere to send them, so nothing is shown.
    const full = site();
    const strip = (sections: SiteContent["sections"]) => sections.filter((s) => s.kind !== "enquiry");
    const bare = page("faq", { ...full, business: { name: "Hartley & Sons" }, sections: strip(full.sections), pages: full.pages?.map((p) => ({ ...p, sections: strip(p.sections) })) });
    expect(bare).not.toContain("Can&#x27;t see your answer?");
  });
  it("doesn't repeat a page's title as a second heading, but keeps it as the section's name for screen readers", () => {
    for (const slug of ["about", "services", "gallery", "faq"]) {
      // The closing banner has its own heading; the page's main section has none.
      const html = page(slug).replace(/<section class="[^"]*closing[^"]*">.*?<\/section>/s, "");
      expect(html.match(/<h2/g) ?? [], slug).toEqual([]);
      expect(html, slug).toContain("aria-label=");
    }
  });
  it("keeps the section headings on a page with several sections, such as Contact", () => {
    expect(page("contact").match(/<h2/g)?.length).toBeGreaterThanOrEqual(2);
  });
});

describe("hero footage", () => {
  it("accepts only an mp4 or webm on this site or at an https address", () => {
    expect(safeVideo("/styler/fitness-raeng-hero.mp4")).toBe("/styler/fitness-raeng-hero.mp4");
    expect(safeVideo("https://example.com/loop.webm?v=2")).toBe("https://example.com/loop.webm?v=2");
    for (const bad of ["http://example.com/a.mp4", "//example.com/a.mp4", "javascript:alert(1)", "/styler/photo.webp", "/a.mp4.exe", "", undefined]) expect(safeVideo(bad), String(bad)).toBeNull();
  });
  it("shows footage only over a photo, with a pause control", () => {
    const withBoth = render(SAMPLE_BARBER, { heroImage: "/styler/barber-hero.webp", heroVideo: "/styler/fitness-raeng-hero.mp4" });
    expect(withBoth).toContain("<video");
    expect(withBoth).toMatch(/background video/);
    expect(render(SAMPLE_BARBER, { heroVideo: "/styler/fitness-raeng-hero.mp4" })).not.toContain("<video");
    expect(render(SAMPLE_BARBER, { heroImage: "/styler/barber-hero.webp" })).not.toContain("<video");
  });
});

describe("request form and reveal", () => {
  it("groups the form into two steps that all show without a script", () => {
    const html = render(SAMPLE_BARBER, { heroImage: "/styler/barber-hero.webp", enquiry: { action: "/api/site-enquiry", token: "t".repeat(24) } });
    expect(html).toContain('data-step="1"');
    expect(html).toContain('data-step="2"');
    expect(html).not.toContain("data-enhanced");
    expect(html).toContain('name="name"');
  });
  it("carries the one fixed reveal script, never anything built from the content", () => {
    const html = render(SAMPLE_BARBER);
    expect(html.match(/<script/g)?.length).toBe(1);
    expect(html).toContain("IntersectionObserver");
  });
});
