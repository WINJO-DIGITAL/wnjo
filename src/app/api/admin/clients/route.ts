import { NextResponse, type NextRequest } from "next/server";
import { serviceClient } from "@/lib/quote-store";
import { userIdFromRequest } from "@/lib/files/server";
import { parseNewClient } from "@/lib/client-invite";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Staff add a new client: a client organisation for their business, and an invite to the owner's email. When they
 * sign in with that email they join the organisation and can see the quotes issued to it.
 */
export async function POST(request: NextRequest) {
  const db = serviceClient();
  if (!db) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const userId = await userIdFromRequest(db, request.headers.get("authorization"));
  if (!userId) return NextResponse.json({ error: "sign_in" }, { status: 401 });

  const parsed = parseNewClient(await request.json().catch(() => null));
  if (!parsed.ok) return NextResponse.json({ error: "invalid", reason: parsed.reason }, { status: 422 });

  const { data: member } = await db
    .from("tenant_members")
    .select("tenant_id")
    .eq("user_id", userId)
    .in("role", ["owner", "admin", "staff"])
    .limit(1);
  const tenantId = ((member ?? []) as Array<{ tenant_id: string }>)[0]?.tenant_id;
  if (!tenantId) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const { data: org, error: orgError } = await db
    .from("organizations")
    .insert({ tenant_id: tenantId, name: parsed.name, created_by: userId })
    .select("id")
    .single();
  if (orgError || !org) {
    console.error("Could not create client organisation");
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
  const organizationId = (org as { id: string }).id;

  const { error: inviteError } = await db
    .from("organization_invites")
    .insert({ tenant_id: tenantId, organization_id: organizationId, email: parsed.email, created_by: userId });
  if (inviteError) {
    console.error("Could not create client invite");
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
  return NextResponse.json({ organizationId, invited: true });
}
