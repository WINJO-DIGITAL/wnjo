import { NextResponse, type NextRequest } from "next/server";
import { serviceClient } from "@/lib/quote-store";
import { userIdFromRequest } from "@/lib/files/server";
import { notificationMailConfig, sendEmail } from "@/lib/mailer";
import { OWNERSHIP } from "@/lib/pricing";
import { stripeConfig, STRIPE_API } from "@/lib/stripe";
import { QUOTE_TERMS_VERSION } from "@/lib/terms";
import { offerEmail } from "@/lib/website-emails";
import { parseWebsiteAnswers, websiteQuote } from "@/lib/website-quote";
import {
  OFFER_TTL_DAYS,
  changeMonthlyPrice,
  newOfferToken,
  newSubscriptionReference,
  offerFromQuote,
  type OfferOverrides,
} from "@/lib/website-subscriptions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const REF = /^WNJO-[0-9A-F]{6}$/;

type Body = {
  action?: unknown;
  enquiryReference?: unknown;
  overrides?: unknown;
  sendEmail?: unknown;
  id?: unknown;
  monthly?: unknown;
};

const pounds = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 100_000 ? v : undefined);

/**
 * Staff actions on website subscriptions:
 * - create: a payment link from a website quote (enquiry), once the written proposal is agreed. Figures can be
 *   adjusted to match the proposal; the browser never sets a price the server hasn't checked.
 * - change_price: an agreed upgrade or downgrade, from the next monthly invoice (no proration).
 * - cancel: ends the subscription at the end of the current period.
 */
export async function POST(request: NextRequest) {
  const db = serviceClient();
  if (!db) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const userId = await userIdFromRequest(db, request.headers.get("authorization"));
  if (!userId) return NextResponse.json({ error: "sign_in" }, { status: 401 });
  const { data: member } = await db
    .from("tenant_members")
    .select("tenant_id")
    .eq("user_id", userId)
    .in("role", ["owner", "admin", "staff"])
    .limit(1);
  const tenantId = ((member ?? []) as { tenant_id: string }[])[0]?.tenant_id;
  if (!tenantId) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const body = ((await request.json().catch(() => null)) ?? {}) as Body;

  if (body.action === "create") {
    const reference = typeof body.enquiryReference === "string" ? body.enquiryReference.trim() : "";
    if (!REF.test(reference)) return NextResponse.json({ error: "invalid" }, { status: 422 });
    const { data: enquiry } = await db
      .from("enquiries")
      .select("reference, name, email, company, answers, tenant_id")
      .eq("reference", reference)
      .eq("tenant_id", tenantId)
      .maybeSingle();
    const e = enquiry as { name: string; email: string; company: string | null; answers: { type?: string; answers?: unknown } | null } | null;
    const answers = e?.answers?.type === "website" ? parseWebsiteAnswers(e.answers.answers) : null;
    if (!e || !answers) return NextResponse.json({ error: "not_a_website_quote" }, { status: 422 });

    const quote = websiteQuote(answers);
    const o = (body.overrides ?? {}) as Record<string, unknown>;
    const overrides: OfferOverrides = { setup: pounds(o.setup), monthly: pounds(o.monthly), oneOff: pounds(o.oneOff) };
    const amounts = offerFromQuote(answers, quote, overrides);
    const { token, hash } = newOfferToken();
    const subReference = newSubscriptionReference();
    const { data: row, error } = await db
      .from("website_subscriptions")
      .insert({
        tenant_id: tenantId,
        reference: subReference,
        kind: amounts.kind,
        email: e.email,
        name: e.name,
        business_name: e.company,
        enquiry_reference: reference,
        package_code: amounts.packageCode,
        package_name: amounts.packageName,
        setup_pence: amounts.setupPence,
        monthly_pence: amounts.monthlyPence,
        one_off_pence: amounts.oneOffPence,
        quote_snapshot: { answers, lines: quote.lines, overrides },
        terms_version: QUOTE_TERMS_VERSION,
        minimum_term_months: OWNERSHIP.minimumTermMonths,
        ownership_after_payments: OWNERSHIP.ownershipAfterPayments,
        offer_token_hash: hash,
        offer_expires_at: new Date(Date.now() + OFFER_TTL_DAYS * 86_400_000).toISOString(),
        created_by: userId,
      })
      .select("id, reference")
      .single();
    if (error || !row) {
      console.error(`Could not create website subscription offer: ${error?.code ?? "unknown"}`);
      return NextResponse.json({ error: "failed" }, { status: 500 });
    }
    // The link is shown once here and emailed if asked; only its hash is stored.
    const link = `${new URL(request.url).origin}/subscribe/${token}`;
    let emailed = false;
    if (body.sendEmail === true) {
      const config = notificationMailConfig();
      if (config) {
        const message = offerEmail(
          {
            reference: subReference,
            name: e.name,
            packageName: amounts.packageName,
            kind: amounts.kind,
            setupPence: amounts.setupPence,
            monthlyPence: amounts.monthlyPence,
            oneOffPence: amounts.oneOffPence,
            ownershipAfterPayments: OWNERSHIP.ownershipAfterPayments,
            minimumTermMonths: OWNERSHIP.minimumTermMonths,
          },
          link,
        );
        emailed = await sendEmail(config, { to: e.email, subject: message.subject, text: message.text }, "Payment link");
      }
    }
    return NextResponse.json({ id: (row as { id: string }).id, reference: subReference, link, emailed });
  }

  if (body.action === "change_price" || body.action === "cancel") {
    const id = typeof body.id === "string" && UUID.test(body.id) ? body.id : null;
    if (!id) return NextResponse.json({ error: "invalid" }, { status: 422 });
    const { data } = await db
      .from("website_subscriptions")
      .select("id, kind, status, stripe_subscription_id")
      .eq("id", id)
      .eq("tenant_id", tenantId)
      .maybeSingle();
    const sub = data as { kind: string; status: string; stripe_subscription_id: string | null } | null;
    if (!sub || sub.kind !== "subscription" || !sub.stripe_subscription_id) {
      return NextResponse.json({ error: "not_active" }, { status: 422 });
    }
    const key = stripeConfig().secretKey;
    if (!key) return NextResponse.json({ error: "not_configured" }, { status: 503 });
    try {
      if (body.action === "change_price") {
        const monthly = pounds(body.monthly);
        if (!monthly) return NextResponse.json({ error: "invalid" }, { status: 422 });
        const monthlyPence = Math.round(monthly * 100);
        await changeMonthlyPrice(key, sub.stripe_subscription_id, monthlyPence);
        await db.from("website_subscriptions").update({ monthly_pence: monthlyPence, updated_at: new Date().toISOString() }).eq("id", id);
      } else {
        const res = await fetch(`${STRIPE_API}/subscriptions/${encodeURIComponent(sub.stripe_subscription_id)}`, {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ cancel_at_period_end: "true" }),
          signal: AbortSignal.timeout(15_000),
        });
        if (!res.ok) throw new Error(`Stripe cancel failed with status ${res.status}`);
        await db.from("website_subscriptions").update({ cancel_at_period_end: true, updated_at: new Date().toISOString() }).eq("id", id);
      }
    } catch (error) {
      console.error(error instanceof Error ? error.message : "Stripe update failed");
      return NextResponse.json({ error: "stripe_failed" }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "invalid" }, { status: 422 });
}
