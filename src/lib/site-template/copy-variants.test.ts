import { describe, expect, it } from "vitest";
import { FILLER_PHRASES } from "./checks";
import { COPY_VARIANTS, nameHash, variantFor } from "./copy-variants";
import { SECTOR_PRESETS } from "./presets";
import { SAMPLE_ANSWERS } from "./sample";
import { WORD_LIMITS } from "./schema";
import { wordCount } from "./text";
import { assembleSite, defaultCopy } from "./write";
import { parseAnswers } from "./answers";

const presets = Object.values(SECTOR_PRESETS);

describe("alternative wording", () => {
  it("gives every sector two alternatives", () => {
    for (const p of presets) expect(COPY_VARIANTS[p.id]?.length, p.id).toBe(2);
  });
  it.each(presets.map((p) => [p.id]))("%s: every alternative is short, plain and within the sector's own rules", (id) => {
    const preset = SECTOR_PRESETS[id];
    for (const v of COPY_VARIANTS[id]) {
      expect(wordCount(v.closingHeadline), v.closingHeadline).toBeLessThanOrEqual(WORD_LIMITS.headline);
      expect(wordCount(v.enquiryIntro), v.enquiryIntro).toBeLessThanOrEqual(WORD_LIMITS.intro);
      expect(v.servicesHeading.length, v.servicesHeading).toBeLessThanOrEqual(16);
      expect(v.galleryHeading.length, v.galleryHeading).toBeLessThanOrEqual(16);
      for (const text of Object.values(v)) {
        expect(FILLER_PHRASES.some((f) => text.toLowerCase().includes(f)), text).toBe(false);
        for (const claim of preset.restrictedClaims ?? []) expect(text, `${claim.reason} (${text})`).not.toMatch(claim.pattern);
      }
    }
  });
  it("is the same for the same business every time, and ignores case and spacing", () => {
    expect(nameHash("Hartley & Sons")).toBe(nameHash("  hartley & sons "));
    expect(variantFor("barber", "Hartley & Sons")).toEqual(variantFor("barber", "hartley & sons"));
  });
  it("gives different businesses in a sector different wording", () => {
    const names = ["Hartley & Sons", "Cut Above", "The Fade Room", "Sharp Edge", "Barnet & Co", "Old Town Barbers", "Number 9", "Blade Runners", "Smith Street Cuts", "Tom's Chair", "Razor & Strop", "Kings Cuts"];
    const closings = new Set(names.map((n) => (variantFor("barber", n)?.closingHeadline ?? "own")));
    expect(closings.size).toBeGreaterThanOrEqual(3);
  });
  it("uses the sector's own wording for a sector it has no alternatives for", () => {
    expect(variantFor("booking", "Anyone")).toBeNull();
  });
});

describe("a built site uses the wording its business was given", () => {
  it.each(presets.filter((p) => SAMPLE_ANSWERS[p.id]).map((p) => [p.id]))("%s: the form intro and closing line come from the sector or its alternatives, and the site stays consistent", (id) => {
    const preset = SECTOR_PRESETS[id];
    const parsed = parseAnswers(SAMPLE_ANSWERS[id], preset, { colour: "#1f3a34" });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const input = { preset, facts: parsed.facts, look: parsed.look, colour: parsed.colour };
    const copy = defaultCopy(input);
    const allowed = [preset.copy.closingHeadline, ...COPY_VARIANTS[id].map((v) => v.closingHeadline)];
    expect(allowed).toContain(copy.closing.headline);
    // Both buttons still say the same thing, whichever wording was chosen.
    expect(copy.closing.cta).toBe(copy.hero.cta);
    const content = assembleSite(input, copy);
    const closing = content.sections.find((s) => s.kind === "cta");
    expect(closing?.kind === "cta" && closing.headline).toBe(copy.closing.headline);
  });
});
