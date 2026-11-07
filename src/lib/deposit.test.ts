import { describe, expect, it } from "vitest";
import { balancePence, depositPence } from "@/lib/deposit";

describe("depositPence", () => {
  it("is half of the total, in whole pence", () => {
    expect(depositPence(180000)).toBe(90000); // £1,800.00 -> £900.00
    expect(depositPence(0)).toBe(0);
  });

  it("rounds an odd penny half up, so the deposit is never less than half", () => {
    expect(depositPence(1)).toBe(1); // 0.5p rounds up to 1p
    expect(depositPence(101)).toBe(51); // 50.5p rounds up
    expect(depositPence(99)).toBe(50); // 49.5p rounds up
  });

  it("refuses amounts that are not whole, non-negative pence", () => {
    expect(() => depositPence(10.5)).toThrow(RangeError);
    expect(() => depositPence(-100)).toThrow(RangeError);
    expect(() => depositPence(Number.NaN)).toThrow(RangeError);
  });
});

describe("balancePence", () => {
  it("is the total minus the deposit, so the two always add up", () => {
    for (const total of [0, 1, 99, 101, 180000, 220001]) {
      expect(depositPence(total) + balancePence(total)).toBe(total);
    }
  });
});
