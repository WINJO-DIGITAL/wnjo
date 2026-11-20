import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * How new websites are made.
 * - auto: the AI plans, picks a style, builds and checks a draft as soon as the customer has paid and sent their goals.
 * - manual: nothing is built automatically. The owner is told, copies the brief, and builds the website themselves.
 * One setting for the agency. Manual mode never stops the owner using the AI by hand on a particular website.
 */
export const BUILD_MODES = ["auto", "manual"] as const;
export type BuildMode = (typeof BUILD_MODES)[number];

export const isBuildMode = (value: unknown): value is BuildMode => typeof value === "string" && (BUILD_MODES as readonly string[]).includes(value);

/**
 * Every website is built by hand until further notice. The AI is shelved, so the mode is always manual, whatever the
 * stored setting says. The stored setting and the switch are kept so auto can come back later.
 */
// The arguments are kept so the callers and the stored setting work unchanged if auto comes back.
export async function getBuildMode(db: SupabaseClient, tenantId: string): Promise<BuildMode> {
  void db;
  void tenantId;
  return "manual";
}

export async function setBuildMode(db: SupabaseClient, tenantId: string, mode: BuildMode): Promise<boolean> {
  const { data, error } = await db.from("tenant_settings").update({ website_build_mode: mode }).eq("tenant_id", tenantId).select("tenant_id");
  return !error && Array.isArray(data) && data.length > 0;
}
