/**
 * Finds the projects whose target date is close enough to raise a deadline event. Pure: the caller supplies the
 * projects and today's date, and the dedupe key means a project raises at most one event per target date.
 */

export const DEADLINE_WINDOW_DAYS = 7;
const OPEN_STATUSES = ["planning", "in_progress"];

export type DeadlineProject = { id: string; tenantId: string; status: string; targetDate: string };

function daysBetween(fromDay: string, toDay: string): number {
  const ms = Date.parse(`${toDay}T00:00:00Z`) - Date.parse(`${fromDay}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

export function dueDeadlines(projects: DeadlineProject[], today: string, windowDays = DEADLINE_WINDOW_DAYS) {
  return projects
    .filter((p) => OPEN_STATUSES.includes(p.status))
    .map((p) => ({ ...p, daysLeft: daysBetween(today, p.targetDate) }))
    .filter((p) => p.daysLeft >= 0 && p.daysLeft <= windowDays)
    .map((p) => ({ projectId: p.id, tenantId: p.tenantId, dedupeKey: `deadline:${p.id}:${p.targetDate}` }));
}
