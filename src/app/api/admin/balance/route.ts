import { NextResponse, type NextRequest } from "next/server";
import { serviceClient } from "@/lib/quote-store";
import { balancePence } from "@/lib/deposit";
import { userIdFromRequest } from "@/lib/files/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const gbp = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });

/**
 * Staff request the final payment once the deposit is paid. This records the balance as due and tells the client
 * (respecting their quote notice choices). The client then pays it from their account.
 */
export async function POST(request: NextRequest) {
  const db = serviceClient();
  if (!db) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const userId = await userIdFromRequest(db, request.headers.get("authorization"));
  if (!userId) return NextResponse.json({ error: "sign_in" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { acceptanceId?: unknown } | null;
  const acceptanceId = typeof body?.acceptanceId === "string" ? body.acceptanceId : "";
  if (!UUID.test(acceptanceId)) return NextResponse.json({ error: "invalid" }, { status: 422 });

  const { data: acceptance } = await db
    .from("quote_acceptances")
    .select("id, tenant_id, quotes(organization_id), quote_versions(build_pence)")
    .eq("id", acceptanceId)
    .maybeSingle();
  const row = acceptance as unknown as {
    id: string;
    tenant_id: string;
    quotes: { organization_id: string | null } | null;
    quote_versions: { build_pence: number } | null;
  } | null;
  if (!row || !row.quote_versions) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const { data: member } = await db
    .from("tenant_members")
    .select("user_id")
    .eq("tenant_id", row.tenant_id)
    .eq("user_id", userId)
    .in("role", ["owner", "admin", "staff"])
    .limit(1);
  if (!member || member.length === 0) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const { data: rows } = await db.from("deposits").select("id, kind, status").eq("quote_acceptance_id", row.id);
  const payments = (rows ?? []) as Array<{ id: string; kind: string; status: string }>;
  const deposit = payments.find((p) => p.kind === "deposit");
  if (!deposit || deposit.status !== "paid") return NextResponse.json({ error: "deposit_not_paid" }, { status: 409 });
  const existing = payments.find((p) => p.kind === "balance");
  if (existing?.status === "paid") return NextResponse.json({ error: "already_paid" }, { status: 409 });
  if (existing) return NextResponse.json({ ok: true, requested: false, amountPence: balancePence(row.quote_versions.build_pence) });

  const amount = balancePence(row.quote_versions.build_pence);
  if (amount <= 0) return NextResponse.json({ error: "nothing_due" }, { status: 409 });
  const { data: created, error } = await db
    .from("deposits")
    .insert({ tenant_id: row.tenant_id, quote_acceptance_id: row.id, amount_pence: amount, kind: "balance" })
    .select("id")
    .single();
  if (error || !created) {
    // A concurrent request may have created it first; the unique key keeps it to one balance.
    if (error?.code === "23505") return NextResponse.json({ ok: true, requested: false, amountPence: amount });
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }

  // Tell the client. Each person's quote notice choices apply: switched off on the site, no notice; switched off by
  // email, the notice stays on the site only.
  const organizationId = row.quotes?.organization_id;
  if (organizationId) {
    const { data: members } = await db.from("organization_members").select("user_id").eq("organization_id", organizationId);
    for (const m of (members ?? []) as Array<{ user_id: string }>) {
      const { data: pref } = await db
        .from("notification_preferences")
        .select("in_app, email")
        .eq("user_id", m.user_id)
        .eq("tenant_id", row.tenant_id)
        .eq("kind", "quote")
        .maybeSingle();
      const p = pref as { in_app: boolean; email: boolean } | null;
      if (p && p.in_app === false) continue;
      await db.from("notifications").upsert(
        {
          tenant_id: row.tenant_id,
          recipient_user_id: m.user_id,
          kind: "quote",
          title: "Your final payment is ready",
          body: `The balance of ${gbp.format(amount / 100)} for your website can now be paid from your account.`,
          link: "/account",
          dedupe_key: `balance:${(created as { id: string }).id}:${m.user_id}`,
          email_wanted: p ? p.email !== false : true,
        },
        { onConflict: "recipient_user_id,dedupe_key", ignoreDuplicates: true },
      );
    }
  }
  return NextResponse.json({ ok: true, requested: true, amountPence: amount });
}
