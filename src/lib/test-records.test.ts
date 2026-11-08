import { describe, expect, it } from "vitest";
import { isTestRecord } from "@/lib/test-records";

describe("isTestRecord", () => {
  it("flags the seeded test records", () => {
    expect(isTestRecord("0000a000-0000-4000-8000-00000000a002")).toBe(true);
  });

  it("never flags a real record, whatever its id", () => {
    expect(isTestRecord("7f3c2a10-9b4e-4d2a-8c11-2e5f6a7b8c9d")).toBe(false);
    expect(isTestRecord(null)).toBe(false);
    expect(isTestRecord(undefined)).toBe(false);
  });
});
