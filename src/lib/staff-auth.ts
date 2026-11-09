import type { SupabaseClient } from "@supabase/supabase-js";
import type { Role } from "./build-journey";

export type Staff = { userId: string; email: string; tenantId: string; role: Role };

const RANK: Record<Role, number> = { owner: 3, admin: 2, staff: 1 };

/**
 * The signed-in member of staff behind a request, with their highest role in the agency. Every approval and stage
 * change is recorded against this person, so it always comes from the verified session, never from the request body.
 */
export async function staffFromRequest(db: SupabaseClient, authorization: string | null): Promise<Staff | null> {
  const token = authorization?.replace(/^Bearer\s+/i, "") ?? "";
  if (!token) return null;
  const { data, error } = await db.auth.getUser(token);
  const user = data?.user;
  if (error || !user?.email) return null;
  const { data: rows } = await db
    .from("tenant_members")
    .select("tenant_id, role")
    .eq("user_id", user.id)
    .in("role", ["owner", "admin", "staff"]);
  const best = ((rows ?? []) as { tenant_id: string; role: Role }[]).sort((a, b) => RANK[b.role] - RANK[a.role])[0];
  if (!best) return null;
  return { userId: user.id, email: user.email.toLowerCase(), tenantId: best.tenant_id, role: best.role };
}

/** The signed-in customer's verified email, for matching them to their own briefs. */
export async function customerFromRequest(
  db: SupabaseClient,
  authorization: string | null,
): Promise<{ userId: string; email: string } | null> {
  const token = authorization?.replace(/^Bearer\s+/i, "") ?? "";
  if (!token) return null;
  const { data, error } = await db.auth.getUser(token);
  const user = data?.user;
  if (error || !user?.email || !user.email_confirmed_at) return null;
  return { userId: user.id, email: user.email.toLowerCase() };
}
