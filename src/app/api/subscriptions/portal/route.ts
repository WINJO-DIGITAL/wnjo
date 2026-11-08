import { NextResponse, type NextRequest } from "next/server";
import { serviceClient } from "@/lib/quote-store";
import { LIMITS_PER_ROUTE, sharedRateLimited } from "@/lib/rate-limit-shared";
import { stripeConfig } from "@/lib/stripe";
import { OFFER_TOKEN_RE, createPortalSession, hashOfferToken } from "@/lib/website-subscriptions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Opens Stripe's billing page for a subscriber (update card, invoices and receipts), from their private link. */
export async function POST(request: NextRequest) {
  const key = stripeConfig().secretKey;
  const db = serviceClient();
  if (!key || !db) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const limit = LIMITS_PER_ROUTE.checkout;
  if (await sharedRateLimited(db, "checkout", ip, limit.max, limit.windowSeconds)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const body = (await request.json().catch(() => null)) as { token?: unknown } | null;
  const token = typeof body?.token === "string" ? body.token : "";
  if (!OFFER_TOKEN_RE.test(token)) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const { data } = await db
    .from("website_subscriptions")
    .select("stripe_customer_id")
    .eq("offer_token_hash", hashOfferToken(token))
    .maybeSingle();
  const customer = (data as { stripe_customer_id: string | null } | null)?.stripe_customer_id;
  if (!customer) return NextResponse.json({ error: "not_found" }, { status: 404 });
  try {
    const url = await createPortalSession(
      key,
      customer,
      `${new URL(request.url).origin}/subscribe/${token}`,
      process.env.STRIPE_PORTAL_CONFIGURATION_ID?.trim() || undefined,
    );
    return NextResponse.json({ url });
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Stripe portal failed");
    return NextResponse.json({ error: "stripe_failed" }, { status: 502 });
  }
}
