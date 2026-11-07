/**
 * The event queue's routing rules. Pure: an event becomes zero or more agent tasks, each with a stable key so
 * retried or duplicate events never create the same work twice. Agent-caused events never re-trigger the agent
 * that caused them, which stops agents from triggering each other in a loop.
 */

export const EVENT_TYPES = [
  "deposit_paid",
  "project_created",
  "task_completed",
  "qa_failed",
  "qa_passed",
  "client_uploaded_files",
  "client_message_received",
  "deadline_approaching",
  "website_unavailable",
  "maintenance_requested",
  "morning_briefing_due",
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export type AgentKey = "project_manager" | "developer" | "qa_engineer" | "client_success" | "operations_manager";

export type AgentEvent = {
  id: string;
  type: EventType;
  tenantId: string;
  projectId: string | null;
  /** The agent that caused the event, if an agent did. */
  sourceAgent?: AgentKey;
};

export type PlannedTask = { agentKey: AgentKey; title: string; dedupeKey: string; projectId: string | null };

const ROUTES: Record<EventType, Array<{ agent: AgentKey; title: string }>> = {
  deposit_paid: [{ agent: "project_manager", title: "Plan the new project from its specification" }],
  project_created: [{ agent: "project_manager", title: "Break the project into milestones and tasks" }],
  task_completed: [{ agent: "project_manager", title: "Reassess dependencies after a task completed" }],
  qa_failed: [{ agent: "developer", title: "Investigate and fix the failing QA checks" }],
  qa_passed: [{ agent: "operations_manager", title: "Evaluate the deployment policy for this release" }],
  client_uploaded_files: [{ agent: "project_manager", title: "Check the required project assets have arrived" }],
  client_message_received: [{ agent: "client_success", title: "Classify and handle the client's message" }],
  deadline_approaching: [{ agent: "operations_manager", title: "Review the project's delivery risk" }],
  website_unavailable: [{ agent: "operations_manager", title: "Check the website and start incident response" }],
  maintenance_requested: [{ agent: "project_manager", title: "Create and allocate the maintenance task" }],
  morning_briefing_due: [{ agent: "operations_manager", title: "Prepare the morning briefing" }],
};

export function planTasksForEvent(event: AgentEvent): PlannedTask[] {
  if (!EVENT_TYPES.includes(event.type)) throw new Error(`Unknown event type: ${event.type}`);
  return ROUTES[event.type]
    .filter((route) => route.agent !== event.sourceAgent)
    .map((route) => ({
      agentKey: route.agent,
      title: route.title,
      projectId: event.projectId,
      // Same event, same agent, same key: a retry or a duplicate delivery maps to the existing task.
      dedupeKey: `${event.type}:${event.id}:${route.agent}`,
    }));
}
