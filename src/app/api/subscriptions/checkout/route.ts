import { NextResponse, type NextRequest } from "next/server";
import { serviceClient } from "@/lib/quote-store";
import { LIMITS_PER_ROUTE, sharedRateLimited } from "@/lib/rate-limit-shared";
import { stripeConfig } from "@/lib/stripe";
import { OFFER_TOKEN_RE, checkoutParams, createOfferCheckout, hashOfferToken } from "@/lib/website-subscriptions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Starts Stripe Checkout for a payment link, once the customer has agreed to the terms and the minimum term. The
 * amounts come from the offer row; nothing in the request can change them. Returns the Stripe page to send them to.
 */
export async function POST(request: NextRequest) {
  const key = stripeConfig().secretKey;
  const db = serviceClient();
  if (!key || !db) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const limit = LIMITS_PER_ROUTE.checkout;
  if (await sharedRateLimited(db, "checkout", ip, limit.max, limit.windowSeconds)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const body = (await request.json().catch(() => null)) as { token?: unknown; agree?: unknown } | null;
  const token = typeof body?.token === "string" ? body.token : "";
  if (!OFFER_TOKEN_RE.test(token)) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (body?.agree !== true) return NextResponse.json({ error: "agree_required" }, { status: 422 });

  const { data } = await db
    .from("website_subscriptions")
    .select("id, reference, kind, status, email, package_code, package_name, setup_pence, monthly_pence, one_off_pence, offer_expires_at")
    .eq("offer_token_hash", hashOfferToken(token))
    .maybeSingle();
  const row = data as {
    id: string;
    reference: string;
    kind: "subscription" | "one_off";
    status: string;
    email: string;
    package_code: "bronze" | "silver" | "gold" | "one_off";
    package_name: string;
    setup_pence: number;
    monthly_pence: number;
    one_off_pence: number;
    offer_expires_at: string;
  } | null;
  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (row.status !== "offered") return NextResponse.json({ error: "already_paid" }, { status: 409 });
  if (new Date(row.offer_expires_at).getTime() < Date.now()) return NextResponse.json({ error: "expired" }, { status: 410 });

  const origin = new URL(request.url).origin;
  try {
    const session = await createOfferCheckout(
      key,
      checkoutParams(
        {
          id: row.id,
          reference: row.reference,
          email: row.email,
          kind: row.kind,
          packageCode: row.package_code,
          packageName: row.package_name,
          setupPence: row.setup_pence,
          monthlyPence: row.monthly_pence,
          oneOffPence: row.one_off_pence,
        },
        {
          success: `${origin}/subscribe/done?session_id={CHECKOUT_SESSION_ID}`,
          cancel: `${origin}/subscribe/${token}`,
        },
      ),
    );
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Stripe checkout failed");
    return NextResponse.json({ error: "stripe_failed" }, { status: 502 });
  }
}
