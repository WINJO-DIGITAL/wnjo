import { NextResponse, type NextRequest } from "next/server";
import { serviceClient } from "@/lib/quote-store";
import { parseSettingsChange } from "@/lib/ai/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Owners and admins change the AI budget and switch agents on, off or paused. Only the server writes these
 * tables. Every change is recorded in the audit log with who made it and the values set.
 */
export async function POST(request: NextRequest) {
  const db = serviceClient();
  if (!db) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!token) return NextResponse.json({ error: "sign_in" }, { status: 401 });
  const { data: userData, error: userError } = await db.auth.getUser(token);
  if (userError || !userData.user) return NextResponse.json({ error: "sign_in" }, { status: 401 });
  const userId = userData.user.id;

  const body = (await request.json().catch(() => null)) as { tenantId?: unknown; change?: unknown } | null;
  const tenantId = typeof body?.tenantId === "string" ? body.tenantId : "";
  if (!UUID.test(tenantId)) return NextResponse.json({ error: "invalid" }, { status: 422 });
  const parsed = parseSettingsChange(body?.change);
  if (!parsed.ok) return NextResponse.json({ error: "invalid", reason: parsed.reason }, { status: 422 });

  const { data: member } = await db
    .from("tenant_members")
    .select("role")
    .eq("tenant_id", tenantId)
    .eq("user_id", userId)
    .in("role", ["owner", "admin"])
    .maybeSingle();
  if (!member) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const change = parsed.change;
  try {
    if (change.action === "budget") {
      const { data: existing, error: findError } = await db
        .from("ai_budget_settings")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("scope", "global")
        .maybeSingle();
      if (findError) throw findError;
      const values = { monthly_limit_pence: change.monthlyPence, warn_at_pence: change.warnAtPence };
      const write = existing
        ? await db.from("ai_budget_settings").update(values).eq("id", (existing as { id: string }).id)
        : await db.from("ai_budget_settings").insert({ tenant_id: tenantId, scope: "global", scope_id: null, ...values });
      if (write.error) throw write.error;
    } else {
      const { data: changed, error: updateError } = await db
        .from("ai_agents")
        .update({ enabled: change.enabled, paused: change.paused })
        .eq("tenant_id", tenantId)
        .eq("agent_key", change.agentKey)
        .select("id");
      if (updateError) throw updateError;
      if (!changed || changed.length === 0) return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const { error: auditError } = await db.from("audit_logs").insert({
      tenant_id: tenantId,
      actor_user_id: userId,
      action: change.action === "budget" ? "ai.budget.updated" : "ai.agent.updated",
      entity: change.action === "budget" ? "ai_budget_settings" : "ai_agents",
      entity_id: change.action === "agent" ? change.agentKey : "global",
      metadata: change.action === "budget"
        ? { monthlyPence: change.monthlyPence, warnAtPence: change.warnAtPence }
        : { enabled: change.enabled, paused: change.paused },
    });
    if (auditError) throw auditError;
    return NextResponse.json({ ok: true });
  } catch {
    console.error("AI settings change failed");
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
