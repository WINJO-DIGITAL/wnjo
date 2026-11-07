import { NextResponse, type NextRequest } from "next/server";
import { serviceClient } from "@/lib/quote-store";
import { decideApproval, type Decision } from "@/lib/ai/approvals";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * An owner or admin of the approval's agency approves or rejects a high-risk agent action. Staff can see the
 * queue but cannot decide it. The caller is identified from their own sign-in token, never from the request body.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: "invalid" }, { status: 422 });

  const db = serviceClient();
  if (!db) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!token) return NextResponse.json({ error: "sign_in" }, { status: 401 });
  const { data: userData, error: userError } = await db.auth.getUser(token);
  const user = userData.user;
  if (userError || !user) return NextResponse.json({ error: "sign_in" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { decision?: unknown } | null;
  const decision = body?.decision;
  if (decision !== "approve" && decision !== "reject") return NextResponse.json({ error: "invalid" }, { status: 422 });

  const { data: approval } = await db.from("ai_approvals").select("tenant_id").eq("id", id).maybeSingle();
  if (!approval) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const tenantId = (approval as { tenant_id: string }).tenant_id;
  const { data: member } = await db
    .from("tenant_members")
    .select("role")
    .eq("tenant_id", tenantId)
    .eq("user_id", user.id)
    .in("role", ["owner", "admin"])
    .maybeSingle();
  if (!member) return NextResponse.json({ error: "not_found" }, { status: 404 });

  try {
    const result = await decideApproval(db, { approvalId: id, decidedBy: user.id, decision: decision as Decision });
    if (result.outcome === "not_found") return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (result.outcome === "already_decided") return NextResponse.json({ error: "already_decided" }, { status: 409 });
    return NextResponse.json({ status: result.status });
  } catch {
    console.error("Approval decision failed");
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
