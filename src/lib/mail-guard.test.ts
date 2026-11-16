import { afterEach, describe, expect, it, vi } from "vitest";
import { isProductionMail, isReservedRecipient } from "./mail-guard";

describe("reserved recipients", () => {
  it("catches .test, .example and example.com", () => {
    expect(isReservedRecipient("customer@sample-cars.test")).toBe(true);
    expect(isReservedRecipient("bookings@sample-cars.test")).toBe(true);
    expect(isReservedRecipient("book@hartley.example")).toBe(true);
    expect(isReservedRecipient("Ada@Example.com")).toBe(true);
    expect(isReservedRecipient("a@sub.example.org")).toBe(true);
    expect(isReservedRecipient("a@example.net")).toBe(true);
    expect(isReservedRecipient("a@invalid.invalid")).toBe(true);
  });

  it("leaves real addresses alone", () => {
    expect(isReservedRecipient("hello@winjodigital.co.uk")).toBe(false);
    expect(isReservedRecipient("owner@shop.co.uk")).toBe(false);
    expect(isReservedRecipient("not-an-email")).toBe(false);
  });
});

describe("production mail", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("is production only when Vercel says so", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("NODE_ENV", "production");
    expect(isProductionMail()).toBe(true);
    vi.stubEnv("VERCEL_ENV", "preview");
    expect(isProductionMail()).toBe(false);
  });

  it("uses NODE_ENV when there is no Vercel environment", () => {
    vi.stubEnv("VERCEL_ENV", "");
    vi.stubEnv("NODE_ENV", "production");
    expect(isProductionMail()).toBe(true);
    vi.stubEnv("NODE_ENV", "test");
    expect(isProductionMail()).toBe(false);
  });
});
