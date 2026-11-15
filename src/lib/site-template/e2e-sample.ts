/**
 * Made-up sample sites for the browser tests: built by the real writer and shown by the real renderer, from the sample
 * businesses. Used by the /e2e-site page and by the live-site fixture. Both exist only when the server starts with
 * E2E=1. Nothing here reads a database or sends anything.
 */
import { parseAnswers } from "./answers";
import { firstPages } from "./pages";
import { SECTOR_PRESETS } from "./presets";
import { SAMPLE_ANSWERS } from "./sample";
import { LAYOUTS, LOOKS, type Layout, type Look, type SiteContent } from "./schema";
import { STANDIN_PHOTOS } from "./template-test";
import { assembleSite, defaultCopy } from "./write";

export type E2EParams = { sector: string; pages: number; layout?: string; look?: string; photos: boolean };

export function buildE2ESample(p: E2EParams): { content: SiteContent; heroImage?: string } | null {
  const preset = SECTOR_PRESETS[p.sector];
  if (!preset) return null;
  const parsed = parseAnswers({ ...SAMPLE_ANSWERS[preset.id], layout: p.layout }, preset, { colour: "#1f3a34" });
  if (!parsed.ok) return null;
  const photos = p.photos ? STANDIN_PHOTOS[preset.id] : undefined;
  const input = {
    preset,
    facts: parsed.facts,
    look: (LOOKS as readonly string[]).includes(p.look ?? "") ? (p.look as Look) : parsed.look,
    layout: (LAYOUTS as readonly string[]).includes(p.layout ?? "") ? (p.layout as Layout) : parsed.layout,
    colour: parsed.colour,
    heroPhoto: photos?.hero,
    images: photos ? photos.gallery.map((src, n) => ({ src, alt: `${parsed.facts.businessName} photo ${n + 1}` })) : [],
    pages: firstPages(p.pages),
    pageLimit: 6,
  };
  const copy = {
    ...defaultCopy(input),
    faq: [
      { question: "Do you take walk-ins?", answer: "Yes, walk-ins are welcome whenever we are open." },
      { question: "Where are you?", answer: "Our address is on the Contact page." },
    ],
  };
  return { content: assembleSite(input, copy), heroImage: input.heroPhoto };
}

/** The address a sample is served on: `<sector>-p<pages>[-<layout>].e2e.test`, for example `barber-p6-split.e2e.test`. */
export function e2eParamsFromHost(host: string): E2EParams | null {
  const m = host.match(/^(.+?)-p([1-6])(?:-(showcase|split|essentials))?\.e2e\.test$/);
  return m ? { sector: m[1], pages: Number(m[2]), layout: m[3], photos: true } : null;
}
