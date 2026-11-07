import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Owner decisions on high-risk agent actions. Approving allows that one tool for that one task and re-queues
 * the task, so the runner carries on from a fresh start with the tool permitted. Rejecting fails the task.
 * The decision is recorded once: a second decision on the same request is refused.
 */

export type Decision = "approve" | "reject";

/** The task change a decision makes. Pure, so the rule is tested without a database. */
export function taskPatchFor(decision: Decision, currentApproved: string[], tool: string): { status: string; approved_tools?: string[] } {
  if (decision === "reject") return { status: "failed" };
  return { status: "queued", approved_tools: [...new Set([...currentApproved, tool])] };
}

export type DecisionOutcome = { outcome: "decided"; status: "approved" | "rejected" } | { outcome: "not_found" } | { outcome: "already_decided" };

export async function decideApproval(
  db: SupabaseClient,
  input: { approvalId: string; decidedBy: string; decision: Decision },
): Promise<DecisionOutcome> {
  const { data: approval, error: loadError } = await db
    .from("ai_approvals")
    .select("id, task_id, tool, status")
    .eq("id", input.approvalId)
    .maybeSingle();
  if (loadError) throw new Error(`Could not load approval: ${loadError.message}`);
  if (!approval) return { outcome: "not_found" };
  const row = approval as { id: string; task_id: string; tool: string; status: string };
  if (row.status !== "pending") return { outcome: "already_decided" };

  const status = input.decision === "approve" ? "approved" : "rejected";
  // The status check in the filter means two owners clicking at once cannot both decide.
  const { data: claimed, error: claimError } = await db
    .from("ai_approvals")
    .update({ status, decided_by: input.decidedBy, decided_at: new Date().toISOString() })
    .eq("id", row.id)
    .eq("status", "pending")
    .select("id");
  if (claimError) throw new Error(`Could not record decision: ${claimError.message}`);
  if (!claimed || claimed.length === 0) return { outcome: "already_decided" };

  const { data: task, error: taskError } = await db.from("ai_tasks").select("approved_tools").eq("id", row.task_id).single();
  if (taskError || !task) throw new Error(`Could not load task: ${taskError?.message ?? "not found"}`);
  const current = Array.isArray((task as { approved_tools: unknown }).approved_tools)
    ? ((task as { approved_tools: string[] }).approved_tools)
    : [];
  const patch = taskPatchFor(input.decision, current, row.tool);
  const { error: updateError } = await db
    .from("ai_tasks")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", row.task_id);
  if (updateError) throw new Error(`Could not update task: ${updateError.message}`);
  return { outcome: "decided", status };
}
