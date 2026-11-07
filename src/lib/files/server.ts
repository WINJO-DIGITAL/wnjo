import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/** The server's view of who a person is for file work: staff of the project's agency, or a client of its organisation. */
export type ProjectAccess = { tenantId: string; organizationId: string | null; projectId: string; isStaff: boolean; isClient: boolean };

export async function userIdFromRequest(db: SupabaseClient, authorization: string | null): Promise<string | null> {
  const token = authorization?.replace(/^Bearer\s+/i, "") ?? "";
  if (!token) return null;
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.id;
}

export async function projectAccess(db: SupabaseClient, userId: string, projectId: string): Promise<ProjectAccess | null> {
  const { data: project } = await db.from("projects").select("id, tenant_id, organization_id").eq("id", projectId).maybeSingle();
  if (!project) return null;
  const p = project as { id: string; tenant_id: string; organization_id: string | null };
  const [staff, client] = await Promise.all([
    db.from("tenant_members").select("user_id").eq("tenant_id", p.tenant_id).eq("user_id", userId).in("role", ["owner", "admin", "staff"]).limit(1),
    p.organization_id
      ? db.from("organization_members").select("user_id").eq("organization_id", p.organization_id).eq("user_id", userId).limit(1)
      : Promise.resolve({ data: [] as unknown[] }),
  ]);
  const isStaff = Boolean(staff.data && staff.data.length > 0);
  const isClient = Boolean(client.data && client.data.length > 0);
  if (!isStaff && !isClient) return null;
  return { tenantId: p.tenant_id, organizationId: p.organization_id, projectId: p.id, isStaff, isClient };
}
