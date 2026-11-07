import { NextResponse, type NextRequest } from "next/server";
import { createQuote, serviceClient } from "@/lib/quote-store";
import { parseQuoteRequest } from "@/lib/quote-request";
import { userIdFromRequest } from "@/lib/files/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Staff issue a quote from a brief enquiry. The price is calculated on the server from the agency's catalogue, never
 * taken from the request. An organisation can be chosen so the client sees the quote once they are a member.
 */
export async function POST(request: NextRequest) {
  const db = serviceClient();
  if (!db) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const userId = await userIdFromRequest(db, request.headers.get("authorization"));
  if (!userId) return NextResponse.json({ error: "sign_in" }, { status: 401 });

  const parsed = parseQuoteRequest(await request.json().catch(() => null));
  if (!parsed.ok) return NextResponse.json({ error: "invalid", reason: parsed.reason }, { status: 422 });

  const { data: enquiry } = await db
    .from("enquiries")
    .select("id, tenant_id, kind, answers")
    .eq("id", parsed.enquiryId)
    .maybeSingle();
  const row = enquiry as { id: string; tenant_id: string; kind: string; answers: unknown } | null;
  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (row.kind !== "brief" || !row.answers) {
    return NextResponse.json({ error: "invalid", reason: "Only a project brief can be priced. This enquiry has no answers." }, { status: 422 });
  }

  const { data: member } = await db
    .from("tenant_members")
    .select("user_id")
    .eq("tenant_id", row.tenant_id)
    .eq("user_id", userId)
    .in("role", ["owner", "admin", "staff"])
    .limit(1);
  if (!member || member.length === 0) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (parsed.organizationId) {
    const { data: org } = await db
      .from("organizations")
      .select("id")
      .eq("id", parsed.organizationId)
      .eq("tenant_id", row.tenant_id)
      .maybeSingle();
    if (!org) return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  try {
    const created = await createQuote({
      tenantId: row.tenant_id,
      organizationId: parsed.organizationId,
      enquiryId: row.id,
      answers: row.answers,
    });
    return NextResponse.json({ quoteId: created.quoteId, reference: created.reference });
  } catch (error) {
    console.error("Quote creation failed:", error instanceof Error ? error.name : "unknown error");
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
