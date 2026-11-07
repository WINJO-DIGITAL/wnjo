import { describe, expect, it } from "vitest";
import { MAX_MONTHLY_PENCE, parseSettingsChange } from "@/lib/ai/settings";

describe("budget settings", () => {
  it("accepts a whole-pence budget with a warning level below it", () => {
    expect(parseSettingsChange({ action: "budget", monthlyPence: 20000, warnAtPence: 16000 })).toEqual({
      ok: true,
      change: { action: "budget", monthlyPence: 20000, warnAtPence: 16000 },
    });
  });

  it("accepts a zero budget, which keeps every agent stopped", () => {
    expect(parseSettingsChange({ action: "budget", monthlyPence: 0, warnAtPence: 0 }).ok).toBe(true);
  });

  it("refuses negative, fractional and oversized budgets", () => {
    expect(parseSettingsChange({ action: "budget", monthlyPence: -1, warnAtPence: 0 }).ok).toBe(false);
    expect(parseSettingsChange({ action: "budget", monthlyPence: 10.5, warnAtPence: 0 }).ok).toBe(false);
    expect(parseSettingsChange({ action: "budget", monthlyPence: MAX_MONTHLY_PENCE + 1, warnAtPence: 0 }).ok).toBe(false);
    expect(parseSettingsChange({ action: "budget", monthlyPence: "100", warnAtPence: 0 }).ok).toBe(false);
  });

  it("refuses a warning level above the budget, since it could never fire", () => {
    const result = parseSettingsChange({ action: "budget", monthlyPence: 1000, warnAtPence: 2000 });
    expect(result).toEqual({ ok: false, reason: "The warning level can't be above the monthly budget." });
  });
});

describe("agent switches", () => {
  it("accepts a known agent with boolean switches", () => {
    expect(parseSettingsChange({ action: "agent", agentKey: "developer", enabled: true, paused: false }).ok).toBe(true);
  });

  it("refuses an unknown agent", () => {
    expect(parseSettingsChange({ action: "agent", agentKey: "root", enabled: true, paused: false }).ok).toBe(false);
  });

  it("refuses non-boolean switches rather than guessing", () => {
    expect(parseSettingsChange({ action: "agent", agentKey: "developer", enabled: "yes", paused: false }).ok).toBe(false);
  });
});

describe("unknown changes", () => {
  it("refuses a missing body and an unknown action", () => {
    expect(parseSettingsChange(null).ok).toBe(false);
    expect(parseSettingsChange({ action: "grant_self_permission" }).ok).toBe(false);
  });
});
