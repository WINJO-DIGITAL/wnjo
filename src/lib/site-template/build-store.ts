import { randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { RawAnswers } from "./answers";
import type { SiteBuildDraft, SiteBuildStore } from "./build";

/** The database side of a template build. Uses the server's key; the browser never reads the access token. */
export class SupabaseSiteBuildStore implements SiteBuildStore {
  constructor(
    private readonly db: SupabaseClient,
    private readonly tenantId: string,
    private readonly userId: string | null,
  ) {}

  async spentPence(briefId: string): Promise<number> {
    const tables = ["website_plans", "website_previews", "website_site_builds"] as const;
    const results = await Promise.all(tables.map((t) => this.db.from(t).select("cost_pence").eq("brief_id", briefId)));
    return results.reduce((total, r) => total + ((r.data ?? []) as { cost_pence: number }[]).reduce((s, row) => s + row.cost_pence, 0), 0);
  }

  async latest(briefId: string) {
    const { data } = await this.db
      .from("website_site_builds")
      .select("id, version, sector, answers")
      .eq("brief_id", briefId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();
    const row = data as { id: string; version: number; sector: string; answers: RawAnswers } | null;
    return row ?? null;
  }

  async save(briefId: string, draft: SiteBuildDraft) {
    const { data: last } = await this.db.from("website_site_builds").select("version").eq("brief_id", briefId).order("version", { ascending: false }).limit(1).maybeSingle();
    const version = ((last as { version: number } | null)?.version ?? 0) + 1;
    const { data, error } = await this.db
      .from("website_site_builds")
      .insert({
        tenant_id: this.tenantId,
        brief_id: briefId,
        version,
        sector: draft.sector,
        answers: draft.answers,
        content: draft.content,
        issues: draft.issues,
        checks_ok: draft.checksOk,
        change_note: draft.changeNote,
        access_token: randomBytes(24).toString("base64url"),
        provider: draft.provider,
        model: draft.model,
        cost_pence: draft.costPence,
        created_by: this.userId,
      })
      .select("id")
      .single();
    if (error || !data) throw new Error("The site build couldn't be saved.");
    return { id: (data as { id: string }).id, version };
  }
}
