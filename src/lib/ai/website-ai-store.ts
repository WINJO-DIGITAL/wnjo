import { randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PlanDraft, PreviewDraft, StoredPlan, WebsiteAiStore } from "./website-pipeline";
import type { WebsitePlan } from "./website-plan";

/** The database side of the AI website steps. Uses the server's key; the browser never reads these tables' secrets. */
export class SupabaseWebsiteAiStore implements WebsiteAiStore {
  constructor(
    private readonly db: SupabaseClient,
    private readonly tenantId: string,
    private readonly userId: string | null,
  ) {}

  async spentPence(briefId: string): Promise<number> {
    const [plans, previews] = await Promise.all([
      this.db.from("website_plans").select("cost_pence").eq("brief_id", briefId),
      this.db.from("website_previews").select("cost_pence").eq("brief_id", briefId),
    ]);
    const sum = (rows: unknown) => ((rows ?? []) as { cost_pence: number }[]).reduce((s, r) => s + r.cost_pence, 0);
    return sum(plans.data) + sum(previews.data);
  }

  async latestPlan(briefId: string): Promise<StoredPlan | null> {
    const { data } = await this.db
      .from("website_plans")
      .select("id, version, plan")
      .eq("brief_id", briefId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();
    const row = data as { id: string; version: number; plan: WebsitePlan } | null;
    return row ? { id: row.id, version: row.version, plan: row.plan } : null;
  }

  private async nextVersion(table: "website_plans" | "website_previews", briefId: string): Promise<number> {
    const { data } = await this.db.from(table).select("version").eq("brief_id", briefId).order("version", { ascending: false }).limit(1).maybeSingle();
    return ((data as { version: number } | null)?.version ?? 0) + 1;
  }

  async savePlan(briefId: string, draft: PlanDraft): Promise<StoredPlan> {
    const version = await this.nextVersion("website_plans", briefId);
    const { data, error } = await this.db
      .from("website_plans")
      .insert({ tenant_id: this.tenantId, brief_id: briefId, version, plan: draft.plan, provider: draft.provider, model: draft.model, cost_pence: draft.costPence, created_by: this.userId })
      .select("id, version")
      .single();
    if (error || !data) throw new Error("The plan couldn't be saved.");
    return { id: (data as { id: string }).id, version, plan: draft.plan };
  }

  async savePreview(briefId: string, draft: PreviewDraft): Promise<{ id: string; version: number }> {
    const version = await this.nextVersion("website_previews", briefId);
    const { data, error } = await this.db
      .from("website_previews")
      .insert({
        tenant_id: this.tenantId,
        brief_id: briefId,
        plan_id: draft.planId,
        version,
        pages: draft.pages,
        change_note: draft.changeNote,
        access_token: randomBytes(24).toString("base64url"),
        provider: draft.provider,
        model: draft.model,
        cost_pence: draft.costPence,
        created_by: this.userId,
      })
      .select("id")
      .single();
    if (error || !data) throw new Error("The preview couldn't be saved.");
    return { id: (data as { id: string }).id, version };
  }
}
