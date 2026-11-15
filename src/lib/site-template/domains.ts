/**
 * The addresses a customer's live website is served on. Only the owner or an admin may attach or remove one, because
 * it changes what the public can see. Attaching an address does not publish anything by itself: the public site shows
 * only once the website's brief is at the "live" stage, which needs all four approvals (see live.ts).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { loadBrief, logEvent, type Actor, type ServiceResult } from "@/lib/ai/website-ai-service";
import { extraMainHosts, normaliseHostname } from "./hosts";

export const MAX_DOMAINS_PER_SITE = 5;
export type SiteDomain = { hostname: string; created_at: string };
type StaffActor = Actor & { role: string };

const mayChange = (staff: StaffActor) => staff.role === "owner" || staff.role === "admin";
const refused: ServiceResult<never> = { ok: false, status: 403, error: "Only the owner or an admin can change a website's address." };

export async function listSiteDomains(db: SupabaseClient, staff: Actor, briefId: string): Promise<ServiceResult<{ domains: SiteDomain[] }>> {
  if (!(await loadBrief(db, staff, briefId))) return { ok: false, status: 404, error: "not_found" };
  const { data } = await db.from("site_domains").select("hostname, created_at").eq("brief_id", briefId).eq("tenant_id", staff.tenantId).order("created_at", { ascending: true });
  return { ok: true, domains: (data ?? []) as SiteDomain[] };
}

export async function attachSiteDomain(db: SupabaseClient, staff: StaffActor, briefId: string, input: string): Promise<ServiceResult<{ hostname: string }>> {
  if (!mayChange(staff)) return refused;
  const hostname = normaliseHostname(input, extraMainHosts(process.env.MAIN_HOSTS));
  if (!hostname) return { ok: false, status: 422, error: "That isn't an address we can use. Use a plain domain such as hartleyandsons.co.uk." };
  if (!(await loadBrief(db, staff, briefId))) return { ok: false, status: 404, error: "not_found" };

  const { data: existing } = await db.from("site_domains").select("brief_id").eq("hostname", hostname).maybeSingle();
  const taken = existing as { brief_id: string } | null;
  if (taken) return taken.brief_id === briefId ? { ok: true, hostname } : { ok: false, status: 409, error: "That address is already used by another website." };

  const { count } = await db.from("site_domains").select("hostname", { count: "exact", head: true }).eq("brief_id", briefId);
  if ((count ?? 0) >= MAX_DOMAINS_PER_SITE) return { ok: false, status: 409, error: `A website can have up to ${MAX_DOMAINS_PER_SITE} addresses.` };

  const { error } = await db.from("site_domains").insert({ hostname, tenant_id: staff.tenantId, brief_id: briefId, created_by: staff.userId });
  if (error) return { ok: false, status: 500, error: "The address couldn't be saved." };
  await logEvent(db, staff, briefId, "note", { text: `Website address attached: ${hostname}` });
  return { ok: true, hostname };
}

export async function removeSiteDomain(db: SupabaseClient, staff: StaffActor, briefId: string, input: string): Promise<ServiceResult> {
  if (!mayChange(staff)) return refused;
  const hostname = normaliseHostname(input, extraMainHosts(process.env.MAIN_HOSTS));
  if (!hostname) return { ok: false, status: 422, error: "That isn't an address we can use." };
  if (!(await loadBrief(db, staff, briefId))) return { ok: false, status: 404, error: "not_found" };
  const { error } = await db.from("site_domains").delete().eq("hostname", hostname).eq("brief_id", briefId).eq("tenant_id", staff.tenantId);
  if (error) return { ok: false, status: 500, error: "The address couldn't be removed." };
  await logEvent(db, staff, briefId, "note", { text: `Website address removed: ${hostname}` });
  return { ok: true };
}
