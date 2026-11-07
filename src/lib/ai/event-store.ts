import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { EventMark, QueuedEvent } from "@/lib/ai/event-processor";
import type { EventType, AgentKey } from "@/lib/ai/events";
import { recoveredStatus, stuckBefore } from "@/lib/ai/recovery";

/** An event is retried by the sweep until this many failed attempts, then it waits for a person to look. */
export const MAX_EVENT_ATTEMPTS = 5;

/**
 * Records a business event once. A repeated delivery with the same dedupe key is ignored, and the existing
 * event's id is returned with created = false.
 */
export async function recordEvent(
  db: SupabaseClient,
  input: { tenantId: string; type: EventType; projectId: string | null; sourceAgent?: AgentKey; dedupeKey: string },
): Promise<{ eventId: string; created: boolean }> {
  const { data, error } = await db
    .from("ai_events")
    .upsert(
      {
        tenant_id: input.tenantId,
        event_type: input.type,
        project_id: input.projectId,
        source_agent: input.sourceAgent ?? null,
        dedupe_key: input.dedupeKey,
      },
      { onConflict: "tenant_id,dedupe_key", ignoreDuplicates: true },
    )
    .select("id");
  if (error) throw new Error(`Could not record event: ${error.message}`);
  const inserted = (data ?? []) as Array<{ id: unknown }>;
  if (inserted.length > 0) return { eventId: String(inserted[0].id), created: true };

  const { data: existing, error: lookupError } = await db
    .from("ai_events")
    .select("id")
    .eq("tenant_id", input.tenantId)
    .eq("dedupe_key", input.dedupeKey)
    .single();
  if (lookupError || !existing) throw new Error(`Could not find recorded event: ${lookupError?.message ?? "not found"}`);
  return { eventId: String((existing as { id: unknown }).id), created: false };
}

/** Events still waiting to be processed, plus failed ones that have attempts left, oldest first. */
export async function listDueEvents(db: SupabaseClient, limit = 20): Promise<Array<QueuedEvent & { attempts: number }>> {
  const { data, error } = await db
    .from("ai_events")
    .select("id, tenant_id, event_type, project_id, source_agent, attempts")
    .in("status", ["pending", "failed"])
    .lt("attempts", MAX_EVENT_ATTEMPTS)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw new Error(`Could not list events: ${error.message}`);
  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    id: String(row.id),
    tenantId: String(row.tenant_id),
    type: row.event_type as EventType,
    projectId: row.project_id ? String(row.project_id) : null,
    sourceAgent: (row.source_agent ?? undefined) as AgentKey | undefined,
    attempts: Number(row.attempts),
  }));
}

export async function markEvent(db: SupabaseClient, eventId: string, attempts: number, mark: EventMark): Promise<void> {
  const update =
    mark.status === "processed"
      ? { status: "processed", processed_at: new Date().toISOString(), last_error: null, attempts: attempts + 1 }
      : { status: "failed", processed_at: null, last_error: mark.error.slice(0, 300), attempts: attempts + 1 };
  const { error } = await db.from("ai_events").update(update).eq("id", eventId);
  if (error) throw new Error(`Could not mark event: ${error.message}`);
}

/** Tasks waiting in the queue, oldest first. Running them is the caller's choice. */
export async function listQueuedTasks(db: SupabaseClient, limit = 10): Promise<string[]> {
  const { data, error } = await db
    .from("ai_tasks")
    .select("id")
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw new Error(`Could not list tasks: ${error.message}`);
  return ((data ?? []) as Array<{ id: unknown }>).map((row) => String(row.id));
}

/**
 * Moves tasks left in "running" by a worker that stopped back to the queue (or fails them when they are out of
 * attempts). Returns how many were re-queued and how many failed.
 */
export async function recoverStuckTasks(db: SupabaseClient, now: Date = new Date()): Promise<{ requeued: number; failed: number }> {
  const { data, error } = await db
    .from("ai_tasks")
    .select("id, attempts, max_attempts")
    .eq("status", "running")
    .lt("updated_at", stuckBefore(now))
    .limit(50);
  if (error) throw new Error(`Could not find stuck tasks: ${error.message}`);
  let requeued = 0;
  let failed = 0;
  for (const row of (data ?? []) as Array<{ id: string; attempts: number; max_attempts: number }>) {
    const status = recoveredStatus(Number(row.attempts), Number(row.max_attempts));
    // Only a task that is still "running" is changed, so a task that finished meanwhile is left alone.
    const { data: changed, error: updateError } = await db
      .from("ai_tasks")
      .update({ status, updated_at: now.toISOString() })
      .eq("id", row.id)
      .eq("status", "running")
      .select("id");
    if (updateError) throw new Error(`Could not recover task: ${updateError.message}`);
    if (changed && changed.length > 0) {
      if (status === "queued") requeued += 1;
      else failed += 1;
    }
  }
  return { requeued, failed };
}
