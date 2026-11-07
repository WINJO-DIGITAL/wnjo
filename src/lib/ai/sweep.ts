import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { processEvents } from "@/lib/ai/event-processor";
import { listDueEvents, markEvent } from "@/lib/ai/event-store";
import { buildAgentRuntime } from "@/lib/ai/agent-runtime";
import { SupabaseTaskQueue } from "@/lib/ai/task-queue";

/**
 * Processes due business events once: plans their tasks, runs the new ones, and records each result. Used by
 * the daily sweep and straight after an event such as a deposit being paid, so nothing waits a day.
 */
export async function processDueEvents(db: SupabaseClient, limit = 20) {
  const due = await listDueEvents(db, limit);
  const attempts = new Map(due.map((event) => [event.id, event.attempts]));
  const runtime = buildAgentRuntime(db);
  return processEvents(due, {
    queue: new SupabaseTaskQueue(db),
    runQueuedTask: runtime.runQueuedTask,
    markEvent: (eventId, mark) => markEvent(db, eventId, attempts.get(eventId) ?? 0, mark),
  });
}
