/**
 * Turns one business event into agent work. Each planned task is queued under a dedupe key, so a repeated
 * delivery of the same event never runs the same work twice. Only newly queued tasks are run; a task that
 * already exists belongs to an earlier delivery and is left alone. A failure in one task never stops the others.
 */

import { planTasksForEvent, type AgentEvent, type PlannedTask } from "@/lib/ai/events";
import type { RunOutcome } from "@/lib/ai/runner";

export interface TaskQueue {
  /** Inserts the task unless one with the same tenant and dedupe key already exists. */
  enqueue(tenantId: string, task: PlannedTask): Promise<{ taskId: string; created: boolean }>;
}

export type EventResult = {
  agentKey: PlannedTask["agentKey"];
  taskId: string | null;
  created: boolean;
  outcome?: RunOutcome;
  error?: string;
};

export async function handleEvent(
  event: AgentEvent,
  deps: {
    queue: TaskQueue;
    /** Runs one queued task to its outcome. Supplied by the caller so the worker stays free of I/O. */
    runQueuedTask: (taskId: string) => Promise<RunOutcome>;
  },
): Promise<EventResult[]> {
  const planned = planTasksForEvent(event);
  const results: EventResult[] = [];
  for (const task of planned) {
    let queued: { taskId: string; created: boolean };
    try {
      queued = await deps.queue.enqueue(event.tenantId, task);
    } catch (error) {
      results.push({ agentKey: task.agentKey, taskId: null, created: false, error: describe(error) });
      continue;
    }
    if (!queued.created) {
      results.push({ agentKey: task.agentKey, taskId: queued.taskId, created: false });
      continue;
    }
    try {
      const outcome = await deps.runQueuedTask(queued.taskId);
      results.push({ agentKey: task.agentKey, taskId: queued.taskId, created: true, outcome });
    } catch (error) {
      // The task stays queued in the database; the error is kept against it rather than lost.
      results.push({ agentKey: task.agentKey, taskId: queued.taskId, created: true, error: describe(error) });
    }
  }
  return results;
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message.slice(0, 300) : "Unknown error";
}
