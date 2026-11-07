import { describe, expect, it } from "vitest";
import { pricingSteps } from "@/lib/pricing-steps";

describe("pricingSteps", () => {
  const steps = pricingSteps();

  it("shows the four steps in order", () => {
    expect(steps.map((s) => s.id)).toEqual(["start", "finish", "monthly", "after"]);
  });

  it("takes the starting price and the monthly price from the price list", () => {
    expect(steps[0].figure).toBe("from £1,800");
    expect(steps[2].figure).toBe("£25 a month");
  });

  it("states the 50% deposit in pounds, from the same rule the quote uses", () => {
    expect(steps[0].text).toContain("£900");
  });

  it("shows the handover length from the Essential package", () => {
    expect(steps[3].figure).toBe("30 days of support");
  });

  it("describes the handover from the Essential package", () => {
    expect(steps[3].text).toContain("30 days of handover support");
  });
});
