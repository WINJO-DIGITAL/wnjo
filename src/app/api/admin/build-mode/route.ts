import { NextResponse, type NextRequest } from "next/server";
import { serviceClient } from "@/lib/quote-store";
import { staffFromRequest } from "@/lib/staff-auth";
import { getBuildMode, isBuildMode, setBuildMode } from "@/lib/website-build-mode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const fail = (status: number, error: string) => NextResponse.json({ error }, { status });

/** The current mode, for any member of staff. */
export async function GET(request: NextRequest) {
  const db = serviceClient();
  if (!db) return fail(503, "not_configured");
  const staff = await staffFromRequest(db, request.headers.get("authorization"));
  if (!staff) return fail(401, "sign_in");
  return NextResponse.json({ mode: await getBuildMode(db, staff.tenantId) });
}

/**
 * Switches how new websites are made: "auto" (the AI drafts them) or "manual" (the owner builds them). Only an owner or
 * an admin may change it. The change is written to the audit log with who made it.
 */
export async function POST(request: NextRequest) {
  const db = serviceClient();
  if (!db) return fail(503, "not_configured");
  const staff = await staffFromRequest(db, request.headers.get("authorization"));
  if (!staff) return fail(401, "sign_in");
  if (staff.role === "staff") return fail(403, "Only an owner or admin can change this.");
  const body = ((await request.json().catch(() => null)) ?? {}) as Record<string, unknown>;
  if (!isBuildMode(body.mode)) return fail(422, "invalid");
  const before = await getBuildMode(db, staff.tenantId);
  if (!(await setBuildMode(db, staff.tenantId, body.mode))) return fail(500, "The setting couldn't be saved.");
  const { error } = await db.from("audit_logs").insert({ tenant_id: staff.tenantId, actor_user_id: staff.userId, action: "website_build_mode.updated", entity: "tenant_settings", entity_id: "website_build_mode", metadata: { from: before, to: body.mode } });
  if (error) console.error(`Build mode change not audited: ${error.code ?? "unknown"}`);
  return NextResponse.json({ mode: body.mode });
}
