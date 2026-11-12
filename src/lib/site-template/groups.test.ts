import { describe, expect, it } from "vitest";
import { BUSINESS_GROUPS, SECTOR_PRESETS } from "./presets";

describe("business groups", () => {
  it("puts every template in one of the three groups", () => {
    for (const p of Object.values(SECTOR_PRESETS)) expect(Object.keys(BUSINESS_GROUPS)).toContain(p.group);
  });

  it("has the three groups the customer chooses from, with the templates we have", () => {
    expect(Object.values(BUSINESS_GROUPS).map((g) => g.label)).toEqual(["Booking services", "Hospitality", "Trades"]);
    expect(SECTOR_PRESETS.barber.group).toBe("booking");
    expect(SECTOR_PRESETS.cafe.group).toBe("hospitality");
    expect(SECTOR_PRESETS.electrician.group).toBe("trades");
  });
});
