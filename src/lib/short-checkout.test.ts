import { describe, expect, it } from "vitest";
import { isPlanlessBuild, isShortCheckout } from "./short-checkout";

describe("isPlanlessBuild", () => {
  it("is true for a bare /build and for links that choose nothing real", () => {
    expect(isPlanlessBuild({})).toBe(true);
    expect(isPlanlessBuild({ plan: "nonsense" })).toBe(true);
    expect(isPlanlessBuild({ care: "none" })).toBe(true);
    expect(isPlanlessBuild({ type: "other" })).toBe(true);
  });

  it("is false once the link says what the visitor chose", () => {
    expect(isPlanlessBuild({ plan: "silver" })).toBe(false);
    expect(isPlanlessBuild({ type: "oneOff" })).toBe(false);
    expect(isPlanlessBuild({ care: "care" })).toBe(false);
    expect(isPlanlessBuild({ draft: "abc" })).toBe(false);
    expect(isPlanlessBuild({ full: "1" })).toBe(false);
  });

  it("never sends a short checkout to the plans", () => {
    expect(isShortCheckout({ plan: "bronze" })).toBe(true);
    expect(isPlanlessBuild({ plan: "bronze" })).toBe(false);
  });
});
