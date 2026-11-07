/**
 * Works through queued business events: plans and queues each one's tasks, runs the new ones, and records the
 * result on the event. An event is only marked processed when every planned task was queued and ran without an
 * error; otherwise it is marked failed with the first error, so the next sweep tries it again. Pure apart from
 * the injected queue, runner and marker, so it is tested without a database.
 */

import { handleEvent, type EventResult, type TaskQueue } from "@/lib/ai/event-worker";
import type { AgentEvent, AgentKey, EventType } from "@/lib/ai/events";
import type { RunOutcome } from "@/lib/ai/runner";

export type QueuedEvent = {
  id: string;
  tenantId: string;
  type: EventType;
  projectId: string | null;
  sourceAgent?: AgentKey;
};

export type EventMark = { status: "processed" } | { status: "failed"; error: string };

export async function processEvents(
  events: QueuedEvent[],
  deps: {
    queue: TaskQueue;
    runQueuedTask: (taskId: string) => Promise<RunOutcome>;
    markEvent: (eventId: string, mark: EventMark) => Promise<void>;
  },
): Promise<{ processed: number; failed: number }> {
  let processed = 0;
  let failed = 0;
  for (const queued of events) {
    const event: AgentEvent = { id: queued.id, tenantId: queued.tenantId, type: queued.type, projectId: queued.projectId, sourceAgent: queued.sourceAgent };
    let mark: EventMark;
    try {
      const results: EventResult[] = await handleEvent(event, { queue: deps.queue, runQueuedTask: deps.runQueuedTask });
      const firstError = results.find((r) => r.error)?.error;
      mark = firstError ? { status: "failed", error: firstError } : { status: "processed" };
    } catch (error) {
      mark = { status: "failed", error: error instanceof Error ? error.message.slice(0, 300) : "Unknown error" };
    }
    await deps.markEvent(queued.id, mark);
    if (mark.status === "processed") processed += 1;
    else failed += 1;
  }
  return { processed, failed };
}
