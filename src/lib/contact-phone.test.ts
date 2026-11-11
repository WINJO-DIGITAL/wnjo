import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

async function hrefFor(value: string | undefined) {
  if (value === undefined) vi.stubEnv("NEXT_PUBLIC_CONTACT_PHONE", "");
  else vi.stubEnv("NEXT_PUBLIC_CONTACT_PHONE", value);
  const mod = await import("@/lib/site");
  return mod.contactPhoneHref;
}

describe("contactPhoneHref", () => {
  it("has no call link until a number is set", async () => {
    expect(await hrefFor(undefined)).toBeNull();
  });

  it("turns a UK mobile into an international tel link", async () => {
    expect(await hrefFor("07700 900 123")).toBe("tel:+447700900123");
  });

  it("keeps an international number as it is", async () => {
    expect(await hrefFor("+44 7700 900123")).toBe("tel:+447700900123");
  });

  it("has no call link for a value that is not a phone number", async () => {
    expect(await hrefFor("call me")).toBeNull();
  });
});
