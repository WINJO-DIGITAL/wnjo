/**
 * The morning briefing. Pure functions: timing (07:30 Europe/London, daylight-saving aware) and the
 * briefing itself, built from real facts. Facts and recommendations are kept in separate lists, so the
 * reader can tell what happened from what the system suggests.
 */

const LONDON = "Europe/London";

/** The offset of London from UTC, in minutes, at a given instant (BST gives +60). */
export function londonOffsetMinutes(instant: Date): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: LONDON,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return Math.round((asUtc - instant.getTime()) / 60000);
}

/** The London calendar date (y, m, d) of an instant. */
function londonDate(instant: Date): { y: number; m: number; d: number } {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: LONDON, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(instant);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { y: get("year"), m: get("month"), d: get("day") };
}

/** The UTC instant at which London shows 07:30 on the given London calendar date. */
export function londonTimeToUtc(y: number, m: number, d: number, hour: number, minute: number): Date {
  const naive = Date.UTC(y, m - 1, d, hour, minute);
  // Two passes handle the offset changing across the boundary.
  let guess = naive - londonOffsetMinutes(new Date(naive)) * 60000;
  guess = naive - londonOffsetMinutes(new Date(guess)) * 60000;
  return new Date(guess);
}

/** The next 07:30 London time strictly after `now`. */
export function nextBriefingAt(now: Date): Date {
  const today = londonDate(now);
  const todayAt = londonTimeToUtc(today.y, today.m, today.d, 7, 30);
  if (todayAt.getTime() > now.getTime()) return todayAt;
  // The day after today's London date, found from noon today (safely away from any clock change).
  const nextDay = londonDate(new Date(londonTimeToUtc(today.y, today.m, today.d, 12, 0).getTime() + 24 * 3600 * 1000));
  return londonTimeToUtc(nextDay.y, nextDay.m, nextDay.d, 7, 30);
}

export type BriefingFacts = {
  activeProjects: number;
  overdueMilestones: Array<{ projectName: string; title: string; dueOn: string }>;
  upcomingDeliveries: Array<{ projectName: string; dueOn: string }>;
  pendingApprovals: Array<{ projectName: string; title: string; openSince: string }>;
  openRevisions: number;
  unansweredClientMessages: Array<{ projectName: string; waitingSince: string }>;
  newEnquiriesLast24h: number;
  failedAiTasks: number;
  aiSpendThisMonthPence: number;
};

export type BriefingItem = { text: string; project?: string };
export type Briefing = {
  generatedFor: string;
  facts: BriefingItem[];
  recommendations: BriefingItem[];
};

/** Turns real facts into a briefing. Recommendations follow only from the facts listed above them. */
export function buildBriefing(facts: BriefingFacts, generatedFor: string): Briefing {
  const items: BriefingItem[] = [
    { text: `${facts.activeProjects} active project${facts.activeProjects === 1 ? "" : "s"}.` },
    { text: `${facts.overdueMilestones.length} overdue milestone${facts.overdueMilestones.length === 1 ? "" : "s"}.` },
    { text: `${facts.pendingApprovals.length} approval${facts.pendingApprovals.length === 1 ? "" : "s"} waiting on clients.` },
    { text: `${facts.unansweredClientMessages.length} client message${facts.unansweredClientMessages.length === 1 ? "" : "s"} unanswered.` },
    { text: `${facts.openRevisions} open revision request${facts.openRevisions === 1 ? "" : "s"}.` },
    { text: `${facts.newEnquiriesLast24h} new enquir${facts.newEnquiriesLast24h === 1 ? "y" : "ies"} in the last 24 hours.` },
    { text: `${facts.failedAiTasks} failed AI task${facts.failedAiTasks === 1 ? "" : "s"}.` },
    { text: `AI spend this month: £${(facts.aiSpendThisMonthPence / 100).toFixed(2)}.` },
  ];
  for (const m of facts.overdueMilestones) items.push({ text: `Overdue: ${m.title}, due ${m.dueOn}.`, project: m.projectName });
  for (const d of facts.upcomingDeliveries) items.push({ text: `Delivery due ${d.dueOn}.`, project: d.projectName });

  const recommendations: BriefingItem[] = [];
  for (const m of facts.overdueMilestones) recommendations.push({ text: `Review the overdue milestone "${m.title}" and set a new date with the client.`, project: m.projectName });
  for (const a of facts.pendingApprovals) recommendations.push({ text: `Chase the approval "${a.title}", waiting since ${a.openSince}.`, project: a.projectName });
  for (const c of facts.unansweredClientMessages) recommendations.push({ text: `Reply to the client, who has been waiting since ${c.waitingSince}.`, project: c.projectName });
  if (facts.failedAiTasks > 0) recommendations.push({ text: "Review the failed AI tasks before enabling more agents." });

  return { generatedFor, facts: items, recommendations };
}

/** Today's date in London as YYYY-MM-DD, so each agency gets one briefing per local day. */
export function londonDay(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
