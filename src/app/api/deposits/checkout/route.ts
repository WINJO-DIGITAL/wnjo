import { NextResponse, type NextRequest } from "next/server";
import { serviceClient } from "@/lib/quote-store";
import { depositPence } from "@/lib/deposit";
import { createDepositCheckout, testSecretKey } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Starts the deposit for an accepted quote. The signed-in client must belong to the quote's organisation.
 * Returns a Stripe Checkout page to send them to. Test mode only (see lib/stripe.ts).
 */
export async function POST(request: NextRequest) {
  const key = testSecretKey(process.env.STRIPE_SECRET_KEY);
  if (!key) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const db = serviceClient();
  if (!db) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!token) return NextResponse.json({ error: "sign_in" }, { status: 401 });
  const { data: userData, error: userError } = await db.auth.getUser(token);
  const user = userData.user;
  if (userError || !user?.email) return NextResponse.json({ error: "sign_in" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { acceptanceId?: unknown } | null;
  const acceptanceId = typeof body?.acceptanceId === "string" ? body.acceptanceId : "";
  if (!UUID.test(acceptanceId)) return NextResponse.json({ error: "invalid" }, { status: 422 });

  const { data: acceptance } = await db
    .from("quote_acceptances")
    .select("id, tenant_id, quote_version_id, quotes(organization_id), quote_versions(build_pence)")
    .eq("id", acceptanceId)
    .maybeSingle();
  const row = acceptance as unknown as {
    id: string;
    tenant_id: string;
    quote_version_id: string;
    quotes: { organization_id: string | null } | null;
    quote_versions: { build_pence: number } | null;
  } | null;
  const organizationId = row?.quotes?.organization_id;
  if (!row || !organizationId || !row.quote_versions) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const { data: member } = await db
    .from("organization_members")
    .select("user_id")
    .eq("organization_id", organizationId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!member) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const amount = depositPence(row.quote_versions.build_pence);
  const { data: existing } = await db
    .from("deposits")
    .select("id, status")
    .eq("quote_acceptance_id", row.id)
    .maybeSingle();
  if (existing?.status === "paid") return NextResponse.json({ error: "already_paid" }, { status: 409 });

  let depositId = existing?.id as string | undefined;
  if (!depositId) {
    const { data: created, error } = await db
      .from("deposits")
      .insert({ tenant_id: row.tenant_id, quote_acceptance_id: row.id, amount_pence: amount })
      .select("id")
      .single();
    if (error || !created) return NextResponse.json({ error: "failed" }, { status: 500 });
    depositId = created.id as string;
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://www.wnjoweb.co.uk";
  try {
    const session = await createDepositCheckout({
      secretKey: key,
      depositId,
      amountPence: amount,
      customerEmail: user.email,
      description: "Website deposit (50%)",
      successUrl: `${site}/account?deposit=paid`,
      cancelUrl: `${site}/account?deposit=cancelled`,
    });
    const { error } = await db.from("deposits").update({ stripe_checkout_session_id: session.id }).eq("id", depositId);
    if (error) throw error;
    return NextResponse.json({ url: session.url });
  } catch {
    // The reason can echo payment details, so it is not returned or logged.
    return NextResponse.json({ error: "payment_unavailable" }, { status: 502 });
  }
}
