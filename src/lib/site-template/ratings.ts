/**
 * Counts the staff ratings of the template test's sites, per template, so quality can be compared across runs. Pure, so
 * it can be tested without a database.
 */
export type RatingRow = { template: string; rating: string };
export type RatingSummary = { template: string; good: number; needsWork: number };

export function summariseRatings(rows: readonly RatingRow[]): RatingSummary[] {
  const byTemplate = new Map<string, RatingSummary>();
  for (const row of rows) {
    const entry = byTemplate.get(row.template) ?? { template: row.template, good: 0, needsWork: 0 };
    if (row.rating === "good") entry.good += 1;
    else if (row.rating === "needs_work") entry.needsWork += 1;
    byTemplate.set(row.template, entry);
  }
  return [...byTemplate.values()].sort((a, b) => a.template.localeCompare(b.template));
}

/** The share of rated sites that were rated good, from 0 to 1. Null when nothing is rated yet. */
export const goodShare = (s: RatingSummary): number | null => (s.good + s.needsWork === 0 ? null : s.good / (s.good + s.needsWork));
