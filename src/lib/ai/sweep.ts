import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { processEvents } from "@/lib/ai/event-processor";
import { listDueEvents, markEvent } from "@/lib/ai/event-store";
import { buildAgentRuntime } from "@/lib/ai/agent-runtime";
import { SupabaseTaskQueue } from "@/lib/ai/task-queue";
import { listQueuedTasks, recoverStuckTasks, recordEvent } from "@/lib/ai/event-store";
import { dueDeadlines, DEADLINE_WINDOW_DAYS, type DeadlineProject } from "@/lib/ai/deadlines";
import { londonDay } from "@/lib/briefing";

/**
 * Processes due business events once: plans their tasks, runs the new ones, and records each result. Used by
 * the daily sweep and straight after an event such as a deposit being paid, so nothing waits a day.
 */
/** Raises a deadline event for each open project whose target date is close. Repeats are ignored by the dedupe key. */
export async function raiseDeadlineEvents(db: SupabaseClient, now: Date = new Date()): Promise<number> {
  const today = londonDay(now);
  const horizon = new Date(Date.parse(`${today}T00:00:00Z`) + DEADLINE_WINDOW_DAYS * 86_400_000).toISOString().slice(0, 10);
  const { data, error } = await db
    .from("projects")
    .select("id, tenant_id, status, target_date")
    .gte("target_date", today)
    .lte("target_date", horizon)
    .in("status", ["planning", "in_progress"]);
  if (error) throw new Error(`Could not read project deadlines: ${error.message}`);
  const projects: DeadlineProject[] = ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    id: String(row.id),
    tenantId: String(row.tenant_id),
    status: String(row.status),
    targetDate: String(row.target_date),
  }));
  let raised = 0;
  for (const due of dueDeadlines(projects, today)) {
    const result = await recordEvent(db, { tenantId: due.tenantId, type: "deadline_approaching", projectId: due.projectId, dedupeKey: due.dedupeKey });
    if (result.created) raised += 1;
  }
  return raised;
}

export async function processDueEvents(db: SupabaseClient, limit = 20) {
  // A failed deadline check must not stop the queued events from being processed.
  await raiseDeadlineEvents(db).catch(() => console.error("Deadline check failed"));
  const due = await listDueEvents(db, limit);
  const attempts = new Map(due.map((event) => [event.id, event.attempts]));
  const runtime = buildAgentRuntime(db);
  return processEvents(due, {
    queue: new SupabaseTaskQueue(db),
    runQueuedTask: runtime.runQueuedTask,
    markEvent: (eventId, mark) => markEvent(db, eventId, attempts.get(eventId) ?? 0, mark),
  });
}

/**
 * Runs queued tasks that are not already running: those re-queued by an owner's approval, and any left behind
 * by an earlier failure. A task that errors is recorded by the runner and does not stop the rest.
 */
export async function processQueuedTasks(db: SupabaseClient, limit = 10) {
  // Tasks whose worker stopped are returned to the queue first, so this sweep can pick them up.
  const recovered = await recoverStuckTasks(db);
  const runtime = buildAgentRuntime(db);
  const tasks = await listQueuedTasks(db, limit);
  let ran = 0;
  let errors = 0;
  for (const taskId of tasks) {
    try {
      await runtime.runQueuedTask(taskId);
      ran += 1;
    } catch {
      errors += 1;
    }
  }
  return { ran, errors, recovered };
}
