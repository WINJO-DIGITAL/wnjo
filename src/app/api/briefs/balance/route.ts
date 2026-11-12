import { NextResponse, type NextRequest } from "next/server";
import { BALANCE_PACKAGE_NAME, balancePenceFor } from "@/lib/pay-now";
import { serviceClient } from "@/lib/quote-store";
import { LIMITS_PER_ROUTE, sharedRateLimited } from "@/lib/rate-limit-shared";
import { customerFromRequest } from "@/lib/staff-auth";
import { stripeConfig } from "@/lib/stripe";
import { createOffer } from "@/lib/website-offers";
import { parseWebsiteAnswers, websiteQuote } from "@/lib/website-quote";
import { checkoutParams, createOfferCheckout } from "@/lib/website-subscriptions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fail = (status: number, error: string) => NextResponse.json({ error }, { status });

/** The customer has approved their website, so the final payment is due; after it is paid the website is handed over. */
const PAYABLE_STAGES = ["approval", "live"];

type Brief = {
  id: string;
  tenant_id: string;
  reference: string;
  email: string;
  name: string;
  business_name: string | null;
  route: string;
  stage: string;
  balance_paid_at: string | null;
};
type Offer = { id: string; reference: string; one_off_pence: number; offer_expires_at: string };

/**
 * The customer pays the rest of a website bought outright: the agreed price minus the 50% deposit. The amount comes
 * only from the accepted proposal and only once the deposit has really been paid; nothing in the request can change it.
 * Returns the Stripe page to send them to. The Stripe webhook records the payment and marks the website ready to hand over.
 */
export async function POST(request: NextRequest) {
  const key = stripeConfig().secretKey;
  const db = serviceClient();
  if (!key || !db) return fail(503, "not_configured");
  const customer = await customerFromRequest(db, request.headers.get("authorization"));
  if (!customer) return fail(401, "Please sign in again.");

  const limit = LIMITS_PER_ROUTE.checkout;
  if (await sharedRateLimited(db, "brief-balance", customer.userId, limit.max, limit.windowSeconds)) return fail(429, "rate_limited");

  const body = ((await request.json().catch(() => null)) ?? {}) as Record<string, unknown>;
  const briefId = typeof body.briefId === "string" && UUID.test(body.briefId) ? body.briefId : null;
  if (!briefId) return fail(422, "invalid");

  const { data } = await db
    .from("website_briefs")
    .select("id, tenant_id, reference, email, name, business_name, route, stage, balance_paid_at")
    .eq("id", briefId)
    .maybeSingle();
  const brief = data as Brief | null;
  // Someone else's build looks exactly like a missing one.
  if (!brief || brief.email.toLowerCase() !== customer.email) return fail(404, "not_found");
  if (brief.route !== "proposal") return fail(409, "This website has no final payment.");
  if (brief.balance_paid_at) return fail(409, "Your final payment has already been made. Thank you.");
  if (!PAYABLE_STAGES.includes(brief.stage)) return fail(409, "Your final payment opens once you've approved your website.");

  const { data: accepted } = await db
    .from("website_proposals")
    .select("one_off_pence")
    .eq("brief_id", brief.id)
    .eq("status", "accepted")
    .order("decided_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const agreed = accepted as { one_off_pence: number } | null;
  if (!agreed || !(agreed.one_off_pence > 0)) return fail(409, "This website has no final payment.");
  const balance = balancePenceFor(agreed.one_off_pence);
  if (!(balance > 0)) return fail(409, "There is nothing left to pay.");

  // The deposit must really be in (the webhook marks it paid) before the balance can be asked for.
  const { data: paidRows } = await db
    .from("website_subscriptions")
    .select("id")
    .eq("enquiry_reference", brief.reference)
    .eq("tenant_id", brief.tenant_id)
    .eq("kind", "one_off")
    .eq("status", "paid")
    .neq("package_name", BALANCE_PACKAGE_NAME)
    .limit(1);
  if (!((paidRows ?? []) as unknown[]).length) return fail(409, "We haven't received your deposit yet, so the final payment isn't open.");

  const { data: enquiry } = await db.from("enquiries").select("answers").eq("reference", brief.reference).eq("tenant_id", brief.tenant_id).maybeSingle();
  const stored = enquiry as { answers: { type?: string; answers?: unknown } | null } | null;
  const answers = stored?.answers?.type === "website" ? parseWebsiteAnswers(stored.answers.answers) : null;
  if (!answers) return fail(422, "We couldn't find the details of your quote. Please contact us.");
  const quote = websiteQuote(answers);
  // Only a website bought outright has a final payment; a monthly plan never gets here.
  if (quote.mode !== "oneOff") return fail(409, "This website has no final payment.");

  // Reuse an open final-payment offer with exactly this amount; close any other open one for this build.
  const { data: open } = await db
    .from("website_subscriptions")
    .select("id, reference, one_off_pence, offer_expires_at")
    .eq("enquiry_reference", brief.reference)
    .eq("tenant_id", brief.tenant_id)
    .eq("status", "offered")
    .eq("package_name", BALANCE_PACKAGE_NAME);
  let offer: { id: string; reference: string } | null = null;
  for (const o of (open ?? []) as Offer[]) {
    const same = o.one_off_pence === balance && new Date(o.offer_expires_at).getTime() > Date.now();
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
      overrides: { oneOff: balance / 100 },
      createdBy: null,
      packageName: BALANCE_PACKAGE_NAME,
    });
    if (!created) return fail(500, "We couldn't start your payment. Please try again.");
    offer = { id: created.id, reference: created.reference };
  }

  const origin = new URL(request.url).origin;
  try {
    const session = await createOfferCheckout(
      key,
      checkoutParams(
        { id: offer.id, reference: offer.reference, email: brief.email, kind: "one_off", packageCode: "one_off", packageName: BALANCE_PACKAGE_NAME, setupPence: 0, monthlyPence: 0, oneOffPence: balance },
        { success: `${origin}/subscribe/done?session_id={CHECKOUT_SESSION_ID}`, cancel: `${origin}/account#builds` },
        { payment_part: "balance" },
      ),
    );
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Stripe checkout failed");
    return fail(502, "stripe_failed");
  }
}
