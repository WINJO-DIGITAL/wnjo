import { describe, expect, it } from "vitest";
import { STYLES } from "./styles";
import { flowFor } from "./flow";
import type { Section } from "./schema";

const home: Section[] = [
  { kind: "hero", variant: "plain", headline: "H", intro: "I", cta: "C" },
  { kind: "services", heading: "S", items: [] },
  { kind: "hours", heading: "Hours", items: [] },
  { kind: "gallery", heading: "G", images: [] },
  { kind: "facts", items: [] },
  { kind: "area", heading: "A", text: "T" },
  { kind: "enquiry", heading: "E", intro: "I", cta: "C" },
  { kind: "faq", heading: "F", items: [] },
  { kind: "cta", headline: "H", cta: "C" },
];
const kinds = (s: Section[]) => s.map((x) => x.kind);

describe("flowFor", () => {
  it("keeps the hero first and the request, questions and closing band last, for every style", () => {
    for (const look of STYLES) {
      const k = kinds(flowFor(look, home));
      expect(k[0]).toBe("hero");
      expect(k.slice(-3)).toEqual(["enquiry", "faq", "cta"]);
    }
  });
  it("adds and removes nothing", () => {
    for (const look of STYLES) expect(kinds(flowFor(look, home)).sort()).toEqual(kinds(home).sort());
  });
  it("keeps hours and find us next to each other", () => {
    for (const look of STYLES) {
      const k = kinds(flowFor(look, home));
      expect(Math.abs(k.indexOf("hours") - k.indexOf("area"))).toBe(1);
    }
  });
  it("gives the styles different orders", () => {
    const orders = new Set(STYLES.map((s) => kinds(flowFor(s, home)).join(",")));
    expect(orders.size).toBeGreaterThanOrEqual(6);
  });
  it("leaves older looks and other pages alone", () => {
    expect(flowFor("warm", home)).toBe(home);
    const noHero = home.slice(1);
    expect(flowFor("clinic", noHero)).toBe(noHero);
  });
});
