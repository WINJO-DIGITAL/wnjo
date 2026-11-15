import { describe, expect, it } from "vitest";
import { recheckSaved, runRows, type SavedRun } from "./recheck";
import { SAMPLES } from "./sample";
import type { SiteContent } from "./schema";
import type { TemplateTestResult } from "./template-test";

const saved = (template: string, change?: (c: SiteContent) => void, wasPassed = true): SavedRun => {
  const content = structuredClone(SAMPLES[template].content) as SiteContent;
  change?.(content);
  return { template, business: content.business.name, model: "fake", passed: wasPassed, cost_pence: 1, pages: 1, facts: SAMPLES[template].facts, content, model_lines: [], issues: [] };
};
const setIntro = (text: string) => (c: SiteContent) => {
  const hero = c.sections.find((s) => s.kind === "hero");
  if (hero?.kind === "hero") hero.intro = text;
};

describe("recheckSaved", () => {
  it("runs today's checks on saved wording and reports which sites still pass", () => {
    const r = recheckSaved([saved("barber"), saved("cafe"), saved("electrician")]);
    expect(r).toMatchObject({ checked: 3, stillPass: 3, nowFail: 0, nowPass: 0 });
  });
  it("finds a site that passed under the old rules and fails the current ones, and says why", () => {
    const r = recheckSaved([saved("barber", setIntro("Award-winning barbers with 25 years of experience.")), saved("cafe")]);
    expect(r.nowFail).toBe(1);
    const bad = r.results.find((x) => !x.passesNow);
    expect(bad?.business).toBe("Hartley & Sons");
    expect(bad?.reasons.join(" ")).toContain("not in the customer's own words");
  });
  it("counts a site that failed before and passes now", () => {
    expect(recheckSaved([saved("barber", undefined, false)]).nowPass).toBe(1);
  });
  it("skips a saved site with no content, or from a template that no longer exists", () => {
    const empty = { ...saved("barber"), content: null };
    const gone = { ...saved("barber"), template: "nope" };
    expect(recheckSaved([empty, gone]).checked).toBe(0);
  });
});

describe("runRows", () => {
  const result: TemplateTestResult = {
    model: "anthropic claude-haiku-5-5",
    passed: 1,
    total: 1,
    pencePerSite: 1,
    rows: [{ template: "Grooming", templateId: "barber", passed: 1, runs: 1, pencePerSite: 1, problems: [], sites: [{ business: "Hartley & Sons", passed: true, costPence: 1, content: SAMPLES.barber.content, facts: SAMPLES.barber.facts, modelLines: [{ label: "Intro", text: "x" }], issues: [] }] }],
  };
  it("turns a finished test into rows that keep the facts, the site, the lines and the cost", () => {
    const rows = runRows(result, 5, "tenant1", "user1");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ tenant_id: "tenant1", template: "barber", business: "Hartley & Sons", model: "anthropic claude-haiku-5-5", passed: true, cost_pence: 1, pages: 5, run_by: "user1" });
    expect(rows[0].facts).toEqual(SAMPLES.barber.facts);
    expect(rows[0].content).toEqual(SAMPLES.barber.content);
  });
});
