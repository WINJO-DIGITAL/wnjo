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
 * The agency's mode. No setting means auto, as before. If the setting can't be read, it is treated as manual: a
 * website that waits for a person is far better than one the owner asked not to have drafted being drafted anyway.
 */
export async function getBuildMode(db: SupabaseClient, tenantId: string): Promise<BuildMode> {
  const { data, error } = await db.from("tenant_settings").select("website_build_mode").eq("tenant_id", tenantId).maybeSingle();
  if (error) return "manual";
  const mode = (data as { website_build_mode?: unknown } | null)?.website_build_mode;
  return isBuildMode(mode) ? mode : "auto";
}

export async function setBuildMode(db: SupabaseClient, tenantId: string, mode: BuildMode): Promise<boolean> {
  const { data, error } = await db.from("tenant_settings").update({ website_build_mode: mode }).eq("tenant_id", tenantId).select("tenant_id");
  return !error && Array.isArray(data) && data.length > 0;
}
