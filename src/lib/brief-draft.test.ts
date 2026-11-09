import { describe, expect, it } from "vitest";
import { cleanDraft, draftHasProgress, draftTooLarge, DRAFT_LIMITS } from "./brief-draft";
import { EMPTY_BRIEF } from "./website-brief";
import { EMPTY_DETAILS } from "./website-enquiry";
import { DEFAULT_WEBSITE_ANSWERS } from "./website-quote";

const ID = "3f1c2a4e-9b7d-4c2a-8e1f-0a1b2c3d4e5f";
const OTHER = "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d";
const valid = () => ({
  answers: DEFAULT_WEBSITE_ANSWERS,
  details: { ...EMPTY_DETAILS, businessName: "Analytical Engines Ltd", email: "ada@example.com" },
  brief: { ...EMPTY_BRIEF, pages: ["Home", "Pricing"], colours: "navy and cream" },
  step: 3,
});
const file = (draft: string, name = "abc12345-logo.png") => ({ path: `drafts/${draft}/${name}`, name: "logo.png", size: 2048, type: "image/png" });

describe("cleanDraft", () => {
  it("keeps a valid draft", () => {
    const d = cleanDraft(valid(), ID);
    expect(d?.step).toBe(3);
    expect(d?.details.businessName).toBe("Analytical Engines Ltd");
    expect(d?.brief.pages).toEqual(["Home", "Pricing"]);
    expect(d?.brief.colours).toBe("navy and cream");
    expect(d?.answers).toEqual(DEFAULT_WEBSITE_ANSWERS);
  });

  it("refuses a draft id that isn't a v4 UUID", () => {
    expect(cleanDraft(valid(), "not-a-uuid")).toBeNull();
    expect(cleanDraft(valid(), "../../etc/passwd")).toBeNull();
    expect(cleanDraft(valid(), "")).toBeNull();
  });

  it("refuses input that isn't an object or has no usable answers", () => {
    expect(cleanDraft(null, ID)).toBeNull();
    expect(cleanDraft("text", ID)).toBeNull();
    expect(cleanDraft({ ...valid(), answers: { plan: "platinum" } }, ID)).toBeNull();
    expect(cleanDraft({ ...valid(), answers: undefined }, ID)).toBeNull();
  });

  it("keeps the step inside its limits and ignores non-integers", () => {
    expect(cleanDraft({ ...valid(), step: -4 }, ID)?.step).toBe(0);
    expect(cleanDraft({ ...valid(), step: 999 }, ID)?.step).toBe(DRAFT_LIMITS.step);
    expect(cleanDraft({ ...valid(), step: 2.5 }, ID)?.step).toBe(0);
    expect(cleanDraft({ ...valid(), step: "5" }, ID)?.step).toBe(0);
  });

  it("drops unknown detail fields", () => {
    const d = cleanDraft({ ...valid(), details: { ...valid().details, isAdmin: true, __proto__: { x: 1 } } }, ID);
    expect(d?.details).not.toHaveProperty("isAdmin");
    expect(Object.keys(d?.details ?? {}).sort()).toEqual(Object.keys(EMPTY_DETAILS).sort());
  });

  it("keeps uploaded files only from this draft's own folder", () => {
    const d = cleanDraft({ ...valid(), brief: { ...valid().brief, files: [file(ID), file(OTHER), file(ID, "../escape.png")] } }, ID);
    expect(d?.brief.files.map((f) => f.path)).toEqual([`drafts/${ID}/abc12345-logo.png`]);
  });

  it("falls back to an empty brief when none is given", () => {
    expect(cleanDraft({ answers: DEFAULT_WEBSITE_ANSWERS }, ID)?.brief).toEqual(EMPTY_BRIEF);
  });
});

describe("draftHasProgress", () => {
  it("is false for a fresh form", () => {
    expect(draftHasProgress({ details: EMPTY_DETAILS, brief: EMPTY_BRIEF, step: 0 })).toBe(false);
  });
  it("is true once the customer moves on, types or changes the brief", () => {
    expect(draftHasProgress({ details: EMPTY_DETAILS, brief: EMPTY_BRIEF, step: 1 })).toBe(true);
    expect(draftHasProgress({ details: { ...EMPTY_DETAILS, email: "a@b.co" }, brief: EMPTY_BRIEF, step: 0 })).toBe(true);
    expect(draftHasProgress({ details: EMPTY_DETAILS, brief: { ...EMPTY_BRIEF, colours: "red" }, step: 0 })).toBe(true);
  });
});

describe("draftTooLarge", () => {
  it("accepts a normal draft and refuses an oversized one", () => {
    expect(draftTooLarge(valid())).toBe(false);
    expect(draftTooLarge({ blob: "x".repeat(DRAFT_LIMITS.bytes + 1) })).toBe(true);
  });
  it("treats a missing draft as empty, not oversized", () => {
    expect(draftTooLarge(undefined)).toBe(false);
  });
  it("treats something that can't be serialised as too large", () => {
    const loop: Record<string, unknown> = {};
    loop.self = loop;
    expect(draftTooLarge(loop)).toBe(true);
  });
});
