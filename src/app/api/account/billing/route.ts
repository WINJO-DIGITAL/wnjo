import { NextResponse, type NextRequest } from "next/server";
import { serviceClient } from "@/lib/quote-store";
import { LIMITS_PER_ROUTE, sharedRateLimited } from "@/lib/rate-limit-shared";
import { customerFromRequest } from "@/lib/staff-auth";
import { stripeConfig } from "@/lib/stripe";
import { createPortalSession } from "@/lib/website-subscriptions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Opens Stripe's billing page for one of the signed-in customer's own subscriptions (card, receipts). The customer is found by
 * their sign-in email, never from the request, so one customer can't open another's billing.
 */
export async function POST(request: NextRequest) {
  const key = stripeConfig().secretKey;
  const db = serviceClient();
  if (!key || !db) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const customer = await customerFromRequest(db, request.headers.get("authorization"));
  if (!customer) return NextResponse.json({ error: "sign_in" }, { status: 401 });

  const limit = LIMITS_PER_ROUTE.checkout;
  if (await sharedRateLimited(db, "account-billing", customer.userId, limit.max, limit.windowSeconds)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const body = ((await request.json().catch(() => null)) ?? {}) as { reference?: unknown };
  const reference = typeof body.reference === "string" && /^WS-[A-Z0-9]{6}$/.test(body.reference) ? body.reference : null;
  let query = db
    .from("website_subscriptions")
    .select("stripe_customer_id")
    .ilike("email", customer.email)
    .not("stripe_customer_id", "is", null);
  if (reference) query = query.eq("reference", reference);
  const { data } = await query.order("created_at", { ascending: false }).limit(1).maybeSingle();
  const stripeCustomer = (data as { stripe_customer_id: string | null } | null)?.stripe_customer_id;
  if (!stripeCustomer) return NextResponse.json({ error: "not_found" }, { status: 404 });

  try {
    const url = await createPortalSession(
      key,
      stripeCustomer,
      `${new URL(request.url).origin}/account`,
      process.env.STRIPE_PORTAL_CONFIGURATION_ID?.trim() || undefined,
    );
    return NextResponse.json({ url });
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Stripe portal failed");
    return NextResponse.json({ error: "stripe_failed" }, { status: 502 });
  }
}
