import type { SupabaseClient } from "@supabase/supabase-js";
import type { AiProvider } from "./provider";
import { runPlanStep, runPreviewStep, type Actor } from "./website-ai-service";

/**
 * The first draft after a payment: for builds waiting at "AI processing" with no plan yet, Grok drafts the plan and then
 * the preview. It only ever drafts. A person releases a preview to the customer, so nothing here is seen by a customer.
 * With no Grok key, nothing runs and the builds wait for staff. Bounded per call, so a slow model can't pile up work.
 */
export async function runAutoDrafts(db: SupabaseClient, provider: AiProvider | null, limit = 2): Promise<{ attempted: number; drafted: number }> {
  if (!provider) return { attempted: 0, drafted: 0 };
  const { data } = await db
    .from("website_briefs")
    .select("id, tenant_id")
    .eq("stage", "specification")
    .order("created_at", { ascending: true })
    .limit(limit * 3);
  const briefs = (data ?? []) as { id: string; tenant_id: string }[];
  let attempted = 0;
  let drafted = 0;
  for (const brief of briefs) {
    if (attempted >= limit) break;
    const { data: existing } = await db.from("website_plans").select("id").eq("brief_id", brief.id).limit(1).maybeSingle();
    if (existing) continue;
    attempted += 1;
    const actor: Actor = { userId: null, email: null, tenantId: brief.tenant_id, kind: "system" };
    try {
      const plan = await runPlanStep(db, actor, provider, brief.id);
      if (!plan.ok) continue;
      const preview = await runPreviewStep(db, actor, provider, brief.id);
      if (preview.ok) drafted += 1;
    } catch (error) {
      console.error(`Automatic draft failed: ${error instanceof Error ? error.message : "unknown"}`);
    }
  }
  return { attempted, drafted };
}
