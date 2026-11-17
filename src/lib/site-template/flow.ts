/**
 * The order of the home page, per style. Every business has the same kinds of section; what makes two styles feel like
 * different websites, and not one website in two skins, is which comes first. The top (hero) and the end (the request,
 * the questions, the closing band) never move. Between them each style leads with what suits it: pictures for a studio,
 * proof for a builder, the price list for a café. "Hours" and "find us" stay together, because they are drawn as a pair.
 * Nothing is added or removed, and sections of the same kind keep their order.
 */
import type { Section } from "./schema";

type Kind = Section["kind"];

const FLOWS: Record<string, Kind[]> = {
  athletic: ["gallery", "services", "facts", "about", "hours", "area"],
  precision: ["facts", "services", "about", "gallery", "area", "hours"],
  boutique: ["gallery", "services", "about", "facts", "hours", "area"],
  executive: ["services", "facts", "about", "area", "hours", "gallery"],
  hearth: ["services", "gallery", "about", "hours", "area", "facts"],
  heritage: ["services", "gallery", "facts", "about", "hours", "area"],
  tradesman: ["facts", "services", "area", "hours", "about", "gallery"],
  clinic: ["facts", "services", "about", "gallery", "hours", "area"],
};

const TAIL: Kind[] = ["enquiry", "faq", "cta"];

export function flowFor(look: string, sections: Section[]): Section[] {
  const order = FLOWS[look];
  if (!order || sections[0]?.kind !== "hero") return sections;
  const rank = (s: Section): number => {
    const tail = TAIL.indexOf(s.kind);
    if (tail >= 0) return 1000 + tail;
    const at = order.indexOf(s.kind);
    return at >= 0 ? at : order.length; // anything not named sits after the named ones, before the request
  };
  const [hero, ...rest] = sections;
  return [hero, ...rest.map((s, i) => ({ s, i })).sort((a, b) => rank(a.s) - rank(b.s) || a.i - b.i).map((x) => x.s)];
}
