import { describe, expect, it } from "vitest";
import { cleanPreviewUrl } from "./manual-preview";

describe("the address of a website the owner built by hand", () => {
  it("accepts a normal https address, tidied", () => {
    expect(cleanPreviewUrl("  https://dazs-cabs.vercel.app/  ")).toEqual({ ok: true, url: "https://dazs-cabs.vercel.app/" });
    expect(cleanPreviewUrl("https://preview.example.co.uk/path?x=1")).toEqual({ ok: true, url: "https://preview.example.co.uk/path?x=1" });
  });

  it("refuses anything that isn't https", () => {
    for (const bad of ["http://example.com", "javascript:alert(1)", "ftp://example.com", "data:text/html,hi", "example.com"]) {
      expect(cleanPreviewUrl(bad).ok, bad).toBe(false);
    }
  });

  it("refuses sign-in details, spaces, local or numeric hosts, and anything empty or too long", () => {
    for (const bad of ["https://user:pass@example.com", "https://exa mple.com", "https://localhost:3000", "https://192.168.1.1/x", "https://intranet/x", "", "   ", `https://example.com/${"a".repeat(500)}`]) {
      expect(cleanPreviewUrl(bad).ok, bad).toBe(false);
    }
    expect(cleanPreviewUrl(42).ok).toBe(false);
    expect(cleanPreviewUrl(null).ok).toBe(false);
  });

  it("says what is wrong, in plain words", () => {
    expect(cleanPreviewUrl("http://example.com")).toEqual({ ok: false, reason: "The address must start with https://" });
    expect(cleanPreviewUrl("")).toEqual({ ok: false, reason: "Paste the address of the website." });
  });
});
