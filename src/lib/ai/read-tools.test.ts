import { describe, expect, it } from "vitest";
import { clampLimit, formatSummary } from "@/lib/ai/read-tools";

describe("formatSummary", () => {
  it("reports each number in plain words, with the deposit in pounds", () => {
    const text = formatSummary({ enquiriesLast7Days: 3, quotesSent: 2, ordersNotLive: 4, depositsPaidPence: 90000, openApprovals: 1 });
    expect(text).toContain("New enquiries in the last 7 days: 3.");
    expect(text).toContain("Deposits received, all time: £900.00.");
    expect(text).toContain("Approvals waiting on a client: 1.");
  });
});

describe("clampLimit", () => {
  it("uses the default for missing or nonsense values, and never exceeds the maximum", () => {
    expect(clampLimit(undefined)).toBe(10);
    expect(clampLimit("abc")).toBe(10);
    expect(clampLimit(0)).toBe(10);
    expect(clampLimit(500)).toBe(25);
    expect(clampLimit(7.9)).toBe(7);
  });
});
