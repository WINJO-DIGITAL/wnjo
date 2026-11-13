import { describe, expect, it } from "vitest";
import { parseAnswers, parseAreas, type RawAnswers } from "./answers";
import { checkSite } from "./checks";
import { BARBER_PRESET, CAFE_PRESET, ELECTRICIAN_PRESET, PHYSIO_PRESET, SECTOR_PRESETS, presetFor } from "./presets";
import { SAMPLES } from "./sample";
import { assembleSite, buildCopyPrompt, parseCopy, type WriteInput } from "./write";

const week = (["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const).map((day) => (day === "Sun" ? { day, closed: true } : { day, open: "09:00", close: "17:00" }));
const blankWeek = (["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const).map((day) => ({ day, open: "", close: "" }));

describe("every sector has a sample build that passes every check", () => {
  for (const preset of Object.values(SECTOR_PRESETS)) {
    it(preset.label, () => {
      const sample = SAMPLES[preset.id];
      expect(sample, `no sample for ${preset.id}`).toBeDefined();
      expect(checkSite(sample.content, sample.facts, preset).issues).toEqual([]);
    });
  }

  it("and each sector is registered", () => {
    expect(presetFor("cafe")).toBe(CAFE_PRESET);
    expect(presetFor("electrician")).toBe(ELECTRICIAN_PRESET);
    expect(presetFor("physio")).toBe(PHYSIO_PRESET);
    expect(presetFor("plumber")).toBeNull();
  });

  it("with the sections a customer expects, in an order that suits the sector", () => {
    const kinds = (p: typeof CAFE_PRESET) => p.sections.map((s) => s.kind);
    expect(kinds(CAFE_PRESET)).toEqual(["hero", "services", "hours", "gallery", "facts", "area", "enquiry", "faq", "cta"]);
    // A trade leads with what it does and where, and hours are optional.
    expect(kinds(ELECTRICIAN_PRESET)).toEqual(["hero", "services", "facts", "gallery", "area", "hours", "enquiry", "faq", "cta"]);
    expect(ELECTRICIAN_PRESET.sections.find((s) => s.kind === "hours")?.required).toBe(false);
    expect(ELECTRICIAN_PRESET.sections.find((s) => s.kind === "area")?.required).toBe(true);
  });
});

describe("the electrician's areas", () => {
  const input = (over: Partial<WriteInput["facts"]> = {}): WriteInput => ({ preset: ELECTRICIAN_PRESET, facts: { ...SAMPLES.electrician.facts, ...over }, look: "bold", colour: "#2b2b2b" });
  const copy = parseCopy(
    JSON.stringify({
      tagline: "t",
      hero: { headline: "Electricians in Leeds", intro: "i", cta: "Get a free quote" },
      headings: { services: "What we do", hours: "Availability", gallery: "Work", area: "Areas we cover", enquiry: "Get a free quote", faq: "Questions" },
      descriptions: {},
      area: "We work in Leeds, Wakefield and Harrogate.",
      enquiry: { intro: "Tell us.", cta: "Send" },
      faq: [],
      closing: { headline: "Need an electrician?", cta: "Get a free quote" },
    }),
  );
  if (!copy.ok) throw new Error("fixture");

  it("builds an area section from the areas given, a prompt for the request box, and no hours section", () => {
    const site = assembleSite(input(), copy.copy);
    expect(site.sections.map((s) => s.kind)).toEqual(["hero", "services", "facts", "area", "enquiry", "cta"]);
    const enquiry = site.sections.find((s) => s.kind === "enquiry");
    expect(enquiry && enquiry.kind === "enquiry" && enquiry.prompt).toBe("What do you need doing?");
    expect(checkSite(site, input().facts, ELECTRICIAN_PRESET).issues).toEqual([]);
  });

  it("is flagged when an area the customer named is left out", () => {
    const site = assembleSite(input(), { ...copy.copy, area: "We work in Leeds and Harrogate." });
    expect(checkSite(site, input().facts, ELECTRICIAN_PRESET).issues.map((i) => i.code)).toContain("area-missing");
  });

  it("is dropped, and flagged, when there are no areas to talk about", () => {
    const facts = { ...input().facts, areas: undefined };
    const site = assembleSite({ ...input(), facts }, copy.copy);
    expect(site.sections.map((s) => s.kind)).not.toContain("area");
    expect(checkSite(site, facts, ELECTRICIAN_PRESET).issues.map((i) => i.code)).toContain("missing-section");
  });

  it("tells the writer the areas and the menu or service label", () => {
    const p = buildCopyPrompt(input());
    expect(p).toContain("Areas covered: Leeds; Wakefield; Harrogate");
    expect(p).toContain("Services: Full rewire");
    expect(buildCopyPrompt({ preset: CAFE_PRESET, facts: SAMPLES.cafe.facts, look: "warm", colour: "#a84a26" })).toContain("Menu items: Flat white");
  });
});

describe("the physio template", () => {
  const sample = SAMPLES.physio;
  const withText = (text: string) => ({ ...sample.content, sections: sample.content.sections.map((x) => (x.kind === "hero" ? { ...x, intro: text } : x)) });
  const issues = (text: string, facts = sample.facts) => checkSite(withText(text), facts, PHYSIO_PRESET).issues.map((i) => i.code);

  it("books by request, with treatments, hours and an address", () => {
    expect(PHYSIO_PRESET.group).toBe("booking");
    expect(PHYSIO_PRESET.sections.filter((x) => x.required).map((x) => x.kind)).toEqual(["hero", "services", "hours", "enquiry", "cta"]);
  });

  it("tells the writer the sector's rules up front, and leaves out a rule the customer's tick has lifted", () => {
    const base = { preset: PHYSIO_PRESET, look: "minimal" as const, colour: "#3d3a7a" };
    const plain = buildCopyPrompt({ ...base, facts: sample.facts });
    expect(plain).toContain("Rules for this sector");
    expect(plain).toContain("must not promise a result or a cure");
    expect(plain).toContain("registration or qualification can only be mentioned if the customer ticked it");
    const ticked = buildCopyPrompt({ ...base, facts: { ...sample.facts, highlights: [...(sample.facts.highlights ?? []), { value: "HCPC", label: "Registered physiotherapist" }] } });
    expect(ticked).toContain("must not promise a result or a cure");
    expect(ticked).not.toContain("registration or qualification can only be mentioned");
  });

  it("never promises a result or a cure", () => {
    expect(issues("We guarantee a full recovery.")).toContain("restricted-claim");
    expect(issues("Our treatment will cure your back pain.")).toContain("restricted-claim");
    expect(issues("Assessment and treatment in Bristol.")).not.toContain("restricted-claim");
  });

  it("claims a registration only when the customer ticked it", () => {
    expect(issues("HCPC registered physiotherapists.")).toContain("restricted-claim");
    const ticked = { ...sample.facts, highlights: [...(sample.facts.highlights ?? []), { value: "HCPC", label: "Registered physiotherapist" }] };
    expect(issues("HCPC registered physiotherapists.", ticked)).not.toContain("restricted-claim");
  });
});

describe("answers by sector", () => {
  const trade: RawAnswers = { businessName: "Spark & Co", servicesText: "Full rewire\nFuse board upgrade £450", areas: "Leeds, Wakefield\nHarrogate, leeds", email: "jobs@sparkandco.example", phone: "0113 496 0789", hours: blankWeek };
  const parse = (r: RawAnswers, preset = ELECTRICIAN_PRESET) => parseAnswers(r, preset, { colour: "#222222" });

  it("accepts an electrician with areas and no hours", () => {
    const r = parse(trade);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.facts.areas).toEqual(["Leeds", "Wakefield", "Harrogate"]);
      expect(r.facts.hours).toBeUndefined();
      expect(r.look).toBe("bold");
    }
  });

  it("still takes hours from an electrician who gives them, and checks them", () => {
    expect(parse({ ...trade, hours: week }).ok).toBe(true);
    const bad = parse({ ...trade, hours: week.map((d) => (d.day === "Tue" ? { day: "Tue" as const, open: "9am", close: "5pm" } : d)) });
    expect(bad.ok === false && bad.errors.hours).toMatch(/Tue/);
  });

  it("needs areas for an electrician, and not for a café", () => {
    const missing = parse({ ...trade, areas: "" });
    expect(missing.ok === false && missing.errors.areas).toBe("Add the areas you cover.");
    const cafe = parse({ businessName: "Harbour", servicesText: "Flat white £3.20", hours: week, email: "hi@harbour.example" }, CAFE_PRESET);
    expect(cafe.ok).toBe(true);
    if (cafe.ok) expect(cafe.look).toBe("warm");
  });

  it("still needs hours for a café, and for a barber", () => {
    const r = parse({ businessName: "Harbour", servicesText: "Flat white", email: "hi@harbour.example", hours: blankWeek }, CAFE_PRESET);
    expect(r.ok === false && r.errors.hours).toBeDefined();
    expect(parse({ businessName: "H", servicesText: "Cut", phone: "01632 960123" }, BARBER_PRESET).ok).toBe(false);
  });

  it("limits the areas", () => {
    expect(parseAreas("a".repeat(50)).error).toMatch(/under 40/);
    expect(parseAreas(Array.from({ length: 12 }, (_, i) => `Town ${i}`).join(",")).error).toMatch(/up to 8/);
    expect(parseAreas(" , ,\n").areas).toEqual([]);
  });

  it("ticks only what the sector offers", () => {
    const r = parse({ ...trade, highlights: ["free-quotes", "walk-ins"] });
    expect(r.ok && r.facts.highlights).toEqual([{ value: "Free", label: "Quotes" }]);
  });
});
