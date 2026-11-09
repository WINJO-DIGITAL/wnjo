import { NextResponse, type NextRequest } from "next/server";
import { serviceClient } from "@/lib/quote-store";
import { LIMITS_PER_ROUTE, sharedRateLimited } from "@/lib/rate-limit-shared";
import { customerFromRequest } from "@/lib/staff-auth";
import { stripeConfig } from "@/lib/stripe";
import { createOffer } from "@/lib/website-offers";
import { parseWebsiteAnswers, websiteQuote } from "@/lib/website-quote";
import { checkoutParams, createOfferCheckout, offerFromQuote, proposalOverrides } from "@/lib/website-subscriptions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fail = (status: number, error: string) => NextResponse.json({ error }, { status });

type Brief = { id: string; tenant_id: string; reference: string; email: string; name: string; business_name: string | null; route: string; stage: string };
type Offer = { id: string; reference: string; kind: string; setup_pence: number; monthly_pence: number; one_off_pence: number; offer_expires_at: string };

/**
 * A customer pays for a bespoke build once they have accepted its approved proposal. The amounts come only from the
 * accepted proposal (never from the request): a one-off build takes the 50% deposit, a monthly build takes its first
 * payment. The customer must agree to the terms first. Returns the Stripe page to send them to.
 */
export async function POST(request: NextRequest) {
  const key = stripeConfig().secretKey;
  const db = serviceClient();
  if (!key || !db) return fail(503, "not_configured");
  const customer = await customerFromRequest(db, request.headers.get("authorization"));
  if (!customer) return fail(401, "Please sign in again.");

  const limit = LIMITS_PER_ROUTE.checkout;
  if (await sharedRateLimited(db, "brief-pay", customer.userId, limit.max, limit.windowSeconds)) return fail(429, "rate_limited");

  const body = ((await request.json().catch(() => null)) ?? {}) as Record<string, unknown>;
  const briefId = typeof body.briefId === "string" && UUID.test(body.briefId) ? body.briefId : null;
  if (!briefId) return fail(422, "invalid");
  if (body.agree !== true) return fail(422, "Please agree to the terms before you pay.");

  const { data } = await db
    .from("website_briefs")
    .select("id, tenant_id, reference, email, name, business_name, route, stage")
    .eq("id", briefId)
    .maybeSingle();
  const brief = data as Brief | null;
  // Someone else's build looks exactly like a missing one.
  if (!brief || brief.email.toLowerCase() !== customer.email) return fail(404, "not_found");
  if (brief.route !== "proposal" || brief.stage !== "awaiting_payment") return fail(409, "This website isn't ready for payment yet.");

  const { data: accepted } = await db
    .from("website_proposals")
    .select("setup_pence, monthly_pence, one_off_pence")
    .eq("brief_id", brief.id)
    .eq("status", "accepted")
    .order("decided_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const agreed = accepted as { setup_pence: number; monthly_pence: number; one_off_pence: number } | null;
  if (!agreed) return fail(409, "Your proposal needs to be accepted first.");

  const { data: enquiry } = await db
    .from("enquiries")
    .select("answers")
    .eq("reference", brief.reference)
    .eq("tenant_id", brief.tenant_id)
    .maybeSingle();
  const stored = enquiry as { answers: { type?: string; answers?: unknown } | null } | null;
  const answers = stored?.answers?.type === "website" ? parseWebsiteAnswers(stored.answers.answers) : null;
  if (!answers) return fail(422, "We couldn't find the details of your quote. Please contact us.");

  const quote = websiteQuote(answers);
  const overrides = proposalOverrides(quote.mode, agreed);
  const amounts = offerFromQuote(answers, quote, overrides);

  // Reuse an open offer with exactly these amounts; close any other open offer for this build (an older proposal's).
  const { data: open } = await db
    .from("website_subscriptions")
    .select("id, reference, kind, setup_pence, monthly_pence, one_off_pence, offer_expires_at")
    .eq("enquiry_reference", brief.reference)
    .eq("tenant_id", brief.tenant_id)
    .eq("status", "offered");
  let offer: { id: string; reference: string } | null = null;
  for (const o of (open ?? []) as Offer[]) {
    const same =
      o.kind === amounts.kind &&
      o.setup_pence === amounts.setupPence &&
      o.monthly_pence === amounts.monthlyPence &&
      o.one_off_pence === amounts.oneOffPence &&
      new Date(o.offer_expires_at).getTime() > Date.now();
    if (same && !offer) offer = { id: o.id, reference: o.reference };
    else await db.from("website_subscriptions").update({ status: "expired" }).eq("id", o.id).eq("status", "offered");
  }
  if (!offer) {
    const created = await createOffer(db, {
      tenantId: brief.tenant_id,
      enquiryReference: brief.reference,
      email: brief.email,
      name: brief.name,
      businessName: brief.business_name,
      answers,
      quote,
      overrides,
      createdBy: null,
      consent: { agreedAt: new Date().toISOString() },
    });
    if (!created) return fail(500, "We couldn't start your payment. Please try again.");
    offer = { id: created.id, reference: created.reference };
  }

  const origin = new URL(request.url).origin;
  try {
    const session = await createOfferCheckout(
      key,
      checkoutParams(
        { id: offer.id, reference: offer.reference, email: brief.email, ...amounts },
        { success: `${origin}/subscribe/done?session_id={CHECKOUT_SESSION_ID}`, cancel: `${origin}/account#builds` },
      ),
    );
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Stripe checkout failed");
    return fail(502, "stripe_failed");
  }
}
