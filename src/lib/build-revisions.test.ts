import { describe, expect, it } from "vitest";
import {
  REVISION_LIMITS,
  REVISION_ROUNDS_INCLUDED,
  approveBlocker,
  cleanRevisionText,
  requestBlocker,
  revisionTransition,
  stageAfterResolve,
} from "./build-revisions";

describe("cleanRevisionText", () => {
  it("keeps a real request, trimmed", () => {
    expect(cleanRevisionText("  Make the logo bigger.  ")).toEqual({ ok: true, text: "Make the logo bigger." });
  });
  it("refuses empty, tiny, non-text and over-long requests", () => {
    expect(cleanRevisionText("")).toMatchObject({ ok: false });
    expect(cleanRevisionText("   ok ")).toMatchObject({ ok: false });
    expect(cleanRevisionText(42)).toMatchObject({ ok: false });
    expect(cleanRevisionText(undefined)).toMatchObject({ ok: false });
    expect(cleanRevisionText("x".repeat(REVISION_LIMITS.text + 1))).toMatchObject({ ok: false });
    expect(cleanRevisionText("x".repeat(REVISION_LIMITS.text))).toMatchObject({ ok: true });
  });
});

describe("requestBlocker", () => {
  it("allows requests only while the preview is with the customer", () => {
    expect(requestBlocker("preview", 0)).toBeNull();
    expect(requestBlocker("changes", 2)).toBeNull();
    for (const stage of ["brief_received", "building", "approval", "live", "closed"] as const) {
      expect(requestBlocker(stage, 0)).toMatch(/preview is ready/);
    }
  });
  it("stops a pile-up of unanswered requests", () => {
    expect(requestBlocker("changes", REVISION_LIMITS.openAtOnce)).toMatch(/still working/);
    expect(requestBlocker("preview", 0, REVISION_ROUNDS_INCLUDED - 1)).toBeNull();
    expect(requestBlocker("preview", 0, REVISION_ROUNDS_INCLUDED)).toMatch(/Contact us/);
  });
});

describe("approveBlocker", () => {
  it("lets the customer approve only a preview with nothing outstanding", () => {
    expect(approveBlocker("preview", 0)).toBeNull();
    expect(approveBlocker("preview", 1)).toMatch(/still being made/);
    expect(approveBlocker("changes", 0)).toMatch(/preview is ready/);
    expect(approveBlocker("live", 0)).toMatch(/preview is ready/);
  });
});

describe("revisionTransition", () => {
  it("moves a waiting change to in progress, then done", () => {
    expect(revisionTransition("open", "start", "")).toEqual({ ok: true, to: "in_progress" });
    expect(revisionTransition("in_progress", "done", "")).toEqual({ ok: true, to: "done" });
    expect(revisionTransition("open", "done", "")).toEqual({ ok: true, to: "done" });
  });
  it("only starts a waiting change", () => {
    expect(revisionTransition("in_progress", "start", "")).toMatchObject({ ok: false, kind: "state" });
  });
  it("needs a reason to decline", () => {
    expect(revisionTransition("open", "decline", "  ")).toMatchObject({ ok: false, kind: "note" });
    expect(revisionTransition("open", "decline", "Outside the package")).toEqual({ ok: true, to: "declined" });
  });
  it("never reopens a finished change", () => {
    for (const status of ["done", "declined"] as const) {
      for (const op of ["start", "done", "decline"] as const) {
        expect(revisionTransition(status, op, "reason")).toMatchObject({ ok: false, kind: "state" });
      }
    }
  });
});

describe("stageAfterResolve", () => {
  it("returns the build to the customer's review once nothing is left", () => {
    expect(stageAfterResolve("changes", 0)).toBe("preview");
  });
  it("stays put while changes are left, and from any other stage", () => {
    expect(stageAfterResolve("changes", 1)).toBeNull();
    expect(stageAfterResolve("preview", 0)).toBeNull();
    expect(stageAfterResolve("approval", 0)).toBeNull();
  });
});

describe("rounds included", () => {
  it("is two rounds for every package, counted from requests the customer has sent", () => {
    expect(REVISION_ROUNDS_INCLUDED).toBe(2);
  });
});
