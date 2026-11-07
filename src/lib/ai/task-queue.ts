import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PlannedTask } from "@/lib/ai/events";
import type { TaskQueue } from "@/lib/ai/event-worker";

/**
 * Queues agent tasks in ai_tasks. The unique (tenant_id, dedupe_key) index does the real deduplication:
 * a repeated insert is ignored, and the existing task's id is returned with created = false.
 */
export class SupabaseTaskQueue implements TaskQueue {
  constructor(private readonly db: SupabaseClient) {}

  async enqueue(tenantId: string, task: PlannedTask) {
    const { data, error } = await this.db
      .from("ai_tasks")
      .upsert(
        {
          tenant_id: tenantId,
          agent_key: task.agentKey,
          project_id: task.projectId,
          title: task.title,
          dedupe_key: task.dedupeKey,
        },
        { onConflict: "tenant_id,dedupe_key", ignoreDuplicates: true },
      )
      .select("id");
    if (error) throw new Error(`Could not queue task: ${error.message}`);
    const inserted = (data ?? []) as Array<{ id: unknown }>;
    if (inserted.length > 0) return { taskId: String(inserted[0].id), created: true };

    const { data: existing, error: lookupError } = await this.db
      .from("ai_tasks")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("dedupe_key", task.dedupeKey)
      .single();
    if (lookupError || !existing) throw new Error(`Could not find queued task: ${lookupError?.message ?? "not found"}`);
    return { taskId: String((existing as { id: unknown }).id), created: false };
  }
}
