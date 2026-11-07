import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { EventMark, QueuedEvent } from "@/lib/ai/event-processor";
import type { EventType, AgentKey } from "@/lib/ai/events";

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
