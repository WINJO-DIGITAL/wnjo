/**
 * Saved template-test sites, and trying today's checks on them again. The test saves each generated site with the
 * facts it was written from. Re-checking runs the current `checkSite` on that saved wording, so a change to the
 * rules can be tried on real model output without calling the model or spending anything. Pure, so it is tested
 * without a database.
 */
import { checkSite } from "./checks";
import { firstPages } from "./pages";
import { SECTOR_PRESETS } from "./presets";
import type { CustomerFacts, SiteContent } from "./schema";
import type { ModelLine, TemplateTestResult } from "./template-test";

/** One saved site, as stored in `template_test_runs`. */
export type SavedRun = {
  template: string;
  business: string;
  model: string;
  passed: boolean;
  cost_pence: number;
  pages: number;
  facts: CustomerFacts;
  content: SiteContent | null;
  model_lines: ModelLine[];
  issues: string[];
};

/** The rows to save for a finished test: every site, with the template's id, so it can be re-checked later. */
export function runRows(result: TemplateTestResult, pages: number, tenantId: string, userId: string | null) {
  return result.rows.flatMap((row) =>
    row.sites.map((site) => ({
      tenant_id: tenantId,
      template: row.templateId,
      business: site.business,
      model: result.model,
      passed: site.passed,
      cost_pence: site.costPence,
      pages,
      facts: site.facts,
      content: site.content,
      model_lines: site.modelLines,
      issues: site.issues,
      run_by: userId,
    })),
  );
}

export type Rechecked = { template: string; business: string; wasPassed: boolean; passesNow: boolean; reasons: string[] };
export type RecheckSummary = { checked: number; stillPass: number; nowFail: number; nowPass: number; results: Rechecked[] };

/** Runs today's checks on saved sites. A saved site with no content (the model's reply was unusable) is skipped. */
export function recheckSaved(runs: readonly SavedRun[]): RecheckSummary {
  const results: Rechecked[] = [];
  for (const run of runs) {
    const preset = SECTOR_PRESETS[run.template];
    if (!preset || !run.content) continue;
    const check = checkSite(run.content, run.facts, preset, { pages: firstPages(run.pages), pageLimit: run.pages });
    results.push({ template: run.template, business: run.business, wasPassed: run.passed, passesNow: check.ok, reasons: check.issues.map((i) => i.message) });
  }
  return {
    checked: results.length,
    stillPass: results.filter((r) => r.wasPassed && r.passesNow).length,
    nowFail: results.filter((r) => r.wasPassed && !r.passesNow).length,
    nowPass: results.filter((r) => !r.wasPassed && r.passesNow).length,
    results,
  };
}
