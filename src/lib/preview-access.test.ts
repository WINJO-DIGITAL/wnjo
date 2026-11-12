import { describe, expect, it } from "vitest";
import { PREVIEW_DAYS, previewExpired } from "./preview-access";

const DAY = 24 * 60 * 60 * 1000;
const now = Date.parse("2026-12-20T12:00:00Z");

describe("preview expiry", () => {
  it("is 30 days", () => {
    expect(PREVIEW_DAYS).toBe(30);
  });
  it("is open inside 30 days of release and closed after", () => {
    expect(previewExpired(new Date(now - 29 * DAY).toISOString(), now)).toBe(false);
    expect(previewExpired(new Date(now - 31 * DAY).toISOString(), now)).toBe(true);
  });
  it("never expires a draft that hasn't been released", () => {
    expect(previewExpired(null, now)).toBe(false);
  });
  it("treats an unreadable release date as closed", () => {
    expect(previewExpired("not a date", now)).toBe(true);
  });
});
