/**
 * What search engines and link previews see of a customer's live site: page titles and descriptions, structured data
 * about the business, the sitemap and the robots file. Built only from content that has already passed the checks, so
 * nothing here can state a fact the customer didn't give. Pure, so it is tested without a server.
 */
import type { HoursItem, Section, SiteContent } from "./schema";
import { cutWords } from "./text";

export type PageInfo = { slug: string; title: string };

/** Every page of the site, Home first. */
export const pagesOf = (content: SiteContent): PageInfo[] => [{ slug: "", title: "Home" }, ...(content.pages ?? []).map((p) => ({ slug: p.slug, title: p.title }))];

const sectionsOf = (content: SiteContent, slug: string): Section[] => (slug ? content.pages?.find((p) => p.slug === slug)?.sections : undefined) ?? content.sections;

/** The page's title as a browser tab and a search result show it. Kept under about 60 characters. */
export function pageTitle(content: SiteContent, slug: string): string {
  const name = content.business.name;
  if (slug) {
    const title = content.pages?.find((p) => p.slug === slug)?.title;
    return title ? `${title} | ${name}` : name;
  }
  const withTagline = content.business.tagline ? `${name} | ${content.business.tagline}` : name;
  return withTagline.length <= 60 ? withTagline : name;
}

/** One or two plain sentences, at most 160 characters, taken from the page's own opening words. */
export function pageDescription(content: SiteContent, slug: string): string {
  const sections = sectionsOf(content, slug);
  const head = sections.find((s) => s.kind === "pagehead" || s.kind === "hero");
  const text = head && (head.kind === "pagehead" || head.kind === "hero") ? head.intro : "";
  const fallback = content.business.tagline ?? content.business.name;
  const chosen = text.trim() || fallback;
  return chosen.length <= 160 ? chosen : cutWords(chosen, 24).slice(0, 160).trim();
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
const dayIndex = (word: string) => DAYS.findIndex((d) => d.toLowerCase().startsWith(word.trim().toLowerCase().slice(0, 3)) && word.trim().length >= 3);

/** "Mon to Fri" and "Sat, Sun" as day names. Anything not understood gives nothing rather than a guess. */
export function daysFrom(label: string): string[] {
  const text = label.trim();
  const range = text.match(/^(\w{3,9})\s*(?:to|-|–)\s*(\w{3,9})$/i);
  if (range) {
    const [from, to] = [dayIndex(range[1]), dayIndex(range[2])];
    if (from < 0 || to < 0 || to < from) return [];
    return DAYS.slice(from, to + 1);
  }
  const each = text.split(/\s*(?:,|&|and)\s*/i).map(dayIndex);
  return each.length && each.every((i) => i >= 0) ? each.map((i) => DAYS[i]) : [];
}

const time = (value: string | undefined) => (value && /^\d{1,2}:\d{2}$/.test(value.trim()) ? value.trim().padStart(5, "0") : null);

function openingHours(items: HoursItem[]) {
  return items.flatMap((h) => {
    const [opens, closes] = [time(h.open), time(h.close)];
    const days = daysFrom(h.day);
    return h.closed || !opens || !closes || !days.length ? [] : [{ "@type": "OpeningHoursSpecification", dayOfWeek: days, opens, closes }];
  });
}

/** Structured data about the business, from its own details. Only fields the customer gave appear. */
export function localBusinessJsonLd(content: SiteContent, url: string, image?: string): Record<string, unknown> {
  const { business } = content;
  const hours = content.sections.find((s): s is Extract<Section, { kind: "hours" }> => s.kind === "hours") ?? content.pages?.flatMap((p) => p.sections).find((s): s is Extract<Section, { kind: "hours" }> => s.kind === "hours");
  const specs = hours ? openingHours(hours.items) : [];
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: business.name,
    url,
    ...(image ? { image } : {}),
    ...(business.phone ? { telephone: business.phone } : {}),
    ...(business.email ? { email: business.email } : {}),
    ...(business.address ? { address: { "@type": "PostalAddress", streetAddress: business.address, addressCountry: "GB" } } : {}),
    ...(specs.length ? { openingHoursSpecification: specs } : {}),
  };
}

/** JSON for a <script type="application/ld+json"> block. "<" is escaped so no text can close the script early. */
export const jsonLdText = (data: unknown): string => JSON.stringify(data).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");

const xml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** The sitemap: every page of the site at its own address. */
export function sitemapXml(origin: string, content: SiteContent, lastModified?: string): string {
  const mod = lastModified && !Number.isNaN(Date.parse(lastModified)) ? `<lastmod>${new Date(lastModified).toISOString().slice(0, 10)}</lastmod>` : "";
  const urls = pagesOf(content).map((p) => `  <url><loc>${xml(`${origin}/${p.slug}`)}</loc>${mod}</url>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
}

/** Everything may be read, and the sitemap is named. */
export const robotsTxt = (origin: string): string => `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${origin}/sitemap.xml\n`;
