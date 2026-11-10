import { describe, expect, it } from "vitest";
import { isTestRecord, TEST_ID_PREFIX } from "./test-records";

describe("test records", () => {
  it("recognises seeded ids by their prefix", () => {
    expect(isTestRecord(`${TEST_ID_PREFIX}0000-4000-8000-00000000a002`)).toBe(true);
  });
  it("recognises the test acceptance that has a random id", () => {
    expect(isTestRecord("d38b5fa9-0f83-45d1-88d5-82f2f951c371")).toBe(true);
  });
  it("never treats a real id as a test record", () => {
    expect(isTestRecord("3f1c2a4e-9b7d-4c2a-8e1f-0a1b2c3d4e5f")).toBe(false);
    expect(isTestRecord(null)).toBe(false);
    expect(isTestRecord(undefined)).toBe(false);
  });
});
