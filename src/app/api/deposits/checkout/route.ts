import { NextResponse, type NextRequest } from "next/server";
import { serviceClient } from "@/lib/quote-store";
import { depositPence } from "@/lib/deposit";
import { createDepositCheckout, stripeConfig } from "@/lib/stripe";
import { userIdFromRequest } from "@/lib/files/server";
import { LIMITS_PER_ROUTE, sharedRateLimited } from "@/lib/rate-limit-shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Starts a payment for an accepted quote, in Stripe test or live mode (STRIPE_MODE; see lib/stripe.ts). Two kinds:
 * - deposit: the 50% when the quote is accepted.
 * - balance: the rest, only after the deposit is paid and staff have requested the balance.
 * The signed-in client must belong to the quote's organisation. Returns a Stripe Checkout page to send them to.
 */
export async function POST(request: NextRequest) {
  const key = stripeConfig().secretKey;
  if (!key) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const db = serviceClient();
  if (!db) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const userId = await userIdFromRequest(db, request.headers.get("authorization"));
  if (!userId) return NextResponse.json({ error: "sign_in" }, { status: 401 });
  const limit = LIMITS_PER_ROUTE.checkout;
  if (await sharedRateLimited(db, "checkout", userId, limit.max, limit.windowSeconds)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const { data: userData } = await db.auth.admin.getUserById(userId);
  const email = userData.user?.email;
  if (!email) return NextResponse.json({ error: "sign_in" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { acceptanceId?: unknown; kind?: unknown } | null;
  const acceptanceId = typeof body?.acceptanceId === "string" ? body.acceptanceId : "";
  if (!UUID.test(acceptanceId)) return NextResponse.json({ error: "invalid" }, { status: 422 });
  const kind = body?.kind === "balance" ? "balance" : "deposit";

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
    .eq("user_id", userId)
    .maybeSingle();
  if (!member) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const { data: rows } = await db
    .from("deposits")
    .select("id, kind, status, amount_pence")
    .eq("quote_acceptance_id", row.id);
  const payments = (rows ?? []) as Array<{ id: string; kind: string; status: string; amount_pence: number }>;
  const deposit = payments.find((p) => p.kind === "deposit");

  let depositId: string;
  let amount: number;
  let description: string;
  let success: string;
  if (kind === "balance") {
    // The balance needs the deposit paid first, and a balance that staff have actually requested.
    if (!deposit || deposit.status !== "paid") return NextResponse.json({ error: "deposit_not_paid" }, { status: 409 });
    const balance = payments.find((p) => p.kind === "balance");
    if (!balance) return NextResponse.json({ error: "not_requested" }, { status: 409 });
    if (balance.status === "paid") return NextResponse.json({ error: "already_paid" }, { status: 409 });
    depositId = balance.id;
    amount = balance.amount_pence;
    description = "Website balance (final 50%)";
    success = "balance=paid";
  } else {
    amount = depositPence(row.quote_versions.build_pence);
    description = "Website deposit (50%)";
    success = "deposit=paid";
    if (deposit?.status === "paid") return NextResponse.json({ error: "already_paid" }, { status: 409 });
    depositId = deposit?.id ?? "";
    if (!depositId) {
      const { data: created, error } = await db
        .from("deposits")
        .insert({ tenant_id: row.tenant_id, quote_acceptance_id: row.id, amount_pence: amount, kind: "deposit" })
        .select("id")
        .single();
      if (error || !created) return NextResponse.json({ error: "failed" }, { status: 500 });
      depositId = created.id as string;
    }
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://winjodigital.co.uk";
  try {
    const session = await createDepositCheckout({
      secretKey: key,
      depositId,
      amountPence: amount,
      customerEmail: email,
      description,
      successUrl: `${site}/account?${success}`,
      cancelUrl: `${site}/account?${success.replace("=paid", "=cancelled")}`,
    });
    const { error } = await db.from("deposits").update({ stripe_checkout_session_id: session.id }).eq("id", depositId);
    if (error) throw error;
    return NextResponse.json({ url: session.url });
  } catch {
    // The reason can echo payment details, so it is not returned or logged.
    return NextResponse.json({ error: "payment_unavailable" }, { status: 502 });
  }
}
