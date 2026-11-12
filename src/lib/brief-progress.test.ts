import { describe, expect, it } from "vitest";
import { cleanProgress, progressTooLarge } from "./brief-progress";

const DRAFT = "3379a901-9d72-4745-ad6a-ce4bc96bf339";
const file = (folder: string) => ({ path: `drafts/${folder}/a.png`, name: "a.png", size: 10, type: "image/png" });

describe("cleanProgress", () => {
  it("keeps what the form saves", () => {
    const p = cleanProgress({ name: " Sam ", businessName: "Shop", step: "goals", draftId: DRAFT, brief: { goals: ["bookings"], otherBusinessType: "Florist" } });
    expect(p).toMatchObject({ name: "Sam", businessName: "Shop", step: "goals", draftId: DRAFT });
    expect(p?.brief.goals).toEqual(["bookings"]);
    expect(p?.brief.otherBusinessType).toBe("Florist");
  });

  it("falls back to the first step for an unknown one, and drops a bad draft id", () => {
    const p = cleanProgress({ step: "nonsense", draftId: "not-a-uuid", brief: {} });
    expect(p?.step).toBe("about");
    expect(p?.draftId).toBeNull();
  });

  it("keeps uploaded files only under the form's own folder", () => {
    const own = cleanProgress({ draftId: DRAFT, brief: { files: [file(DRAFT)] } });
    expect(own?.brief.files).toHaveLength(1);
    const foreign = cleanProgress({ draftId: DRAFT, brief: { files: [file("someone-elses-folder")] } });
    expect(foreign?.brief.files).toEqual([]);
    const noDraft = cleanProgress({ brief: { files: [file(DRAFT)] } });
    expect(noDraft?.brief.files).toEqual([]);
  });

  it("strips tags and trims names to the limits", () => {
    expect(cleanProgress({ name: "<b>Sam</b>", businessName: "x".repeat(300), brief: {} })).toMatchObject({ name: "Sam" });
    expect(cleanProgress({ businessName: "x".repeat(300), brief: {} })?.businessName).toHaveLength(120);
  });

  it("rejects anything that isn't an object", () => {
    expect(cleanProgress(null)).toBeNull();
    expect(cleanProgress("x")).toBeNull();
  });
});

describe("progressTooLarge", () => {
  it("flags a save bigger than the server accepts", () => {
    expect(progressTooLarge({ a: "x".repeat(70_000) })).toBe(true);
    expect(progressTooLarge({ a: "small" })).toBe(false);
  });
});
