import { NextResponse, type NextRequest } from "next/server";
import { canRequestCancel, cleanCancelRequest, describeCancelRequest } from "@/lib/cancel-request";
import { notificationMailConfig, sendEmail } from "@/lib/mailer";
import { STRIPE_API, stripeConfig } from "@/lib/stripe";
import { serviceClient } from "@/lib/quote-store";
import { LIMITS_PER_ROUTE, sharedRateLimited } from "@/lib/rate-limit-shared";
import { customerFromRequest } from "@/lib/staff-auth";
import { cancelRequestEmail } from "@/lib/website-emails";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const fail = (status: number, error: string) => NextResponse.json({ error }, { status });

type Sub = {
  id: string;
  tenant_id: string;
  reference: string;
  kind: string;
  status: string;
  email: string;
  name: string;
  package_name: string;
  minimum_term_months: number;
  monthly_pence: number;
  ownership_after_payments: number;
  cancel_at_period_end: boolean | null;
  stripe_subscription_id: string | null;
  current_period_end: string | null;
};

/**
 * Ends a rolling plan at the end of the billing period the customer has already paid for. Stripe is told, and our record
 * follows Stripe's answer. Returns the end date, or null when Stripe could not be reached (staff are then alerted).
 */
async function endAtPeriodEnd(stripeSubscriptionId: string): Promise<string | null> {
  const key = stripeConfig().secretKey;
  if (!key) return null;
  const res = await fetch(`${STRIPE_API}/subscriptions/${encodeURIComponent(stripeSubscriptionId)}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ cancel_at_period_end: "true" }),
    signal: AbortSignal.timeout(15_000),
  }).catch(() => null);
  if (!res?.ok) return null;
  const json = (await res.json().catch(() => null)) as { current_period_end?: number; items?: { data?: { current_period_end?: number }[] } } | null;
  const end = json?.current_period_end ?? json?.items?.data?.[0]?.current_period_end;
  return typeof end === "number" ? new Date(end * 1000).toISOString() : null;
}

/**
 * A customer asks to cancel a website plan from their account. It is recorded the moment they ask, so there is a clear
 * time they asked, and they and staff are emailed. Staff then process it; nothing is cancelled here, so the minimum term
 * stays in staff hands. Only the plan's own signed-in owner can ask, found by their sign-in email, never from the request.
 * - status: whether the plan can be asked to cancel, and whether a request is already open.
 * - request: records the request. Asking twice does nothing new.
 */
export async function POST(request: NextRequest) {
  const db = serviceClient();
  if (!db) return fail(503, "not_configured");
  const customer = await customerFromRequest(db, request.headers.get("authorization"));
  if (!customer) return fail(401, "sign_in");
  const limit = LIMITS_PER_ROUTE.checkout;
  if (await sharedRateLimited(db, "cancel-request", customer.userId, limit.max, limit.windowSeconds)) return fail(429, "rate_limited");

  const body = ((await request.json().catch(() => null)) ?? {}) as Record<string, unknown>;
  const reference = typeof body.reference === "string" && /^WS-[0-9A-F]{6}$/.test(body.reference) ? body.reference : null;
  if (!reference || (body.action !== "status" && body.action !== "request")) return fail(422, "invalid");

  const { data } = await db
    .from("website_subscriptions")
    .select("id, tenant_id, reference, kind, status, email, name, package_name, minimum_term_months, monthly_pence, ownership_after_payments, cancel_at_period_end, stripe_subscription_id, current_period_end")
    .eq("reference", reference)
    .maybeSingle();
  const sub = data as Sub | null;
  // Someone else's plan looks exactly like a missing one.
  if (!sub || sub.email.trim().toLowerCase() !== customer.email.trim().toLowerCase()) return fail(404, "not_found");

  const { data: open } = await db.from("website_cancellation_requests").select("id").eq("subscription_id", sub.id).eq("status", "open").maybeSingle();
  const alreadyOpen = Boolean(open);

  if (body.action === "status") return NextResponse.json({ canRequest: canRequestCancel(sub), requested: alreadyOpen });

  if (alreadyOpen) return NextResponse.json({ ok: true, alreadyRequested: true });
  if (!canRequestCancel(sub)) return fail(409, "This plan can't be cancelled from here. Reply to our email and we'll help.");

  const asked = cleanCancelRequest(body);
  const reason = describeCancelRequest(asked);
  const { error } = await db.from("website_cancellation_requests").insert({ tenant_id: sub.tenant_id, subscription_id: sub.id, reason, status: "open" });
  // Two requests at once: the database allows one open request, so the second is the same request, not a failure.
  if (error) return error.code === "23505" ? NextResponse.json({ ok: true, alreadyRequested: true }) : fail(500, "We couldn't record that just now. Please try again.");

  // A rolling plan (no minimum term) ends at the end of the period already paid for, automatically. A plan with a term
  // is left for staff, as before.
  let endsOn: string | null = null;
  let processed = false;
  if (sub.minimum_term_months === 0 && sub.stripe_subscription_id) {
    endsOn = await endAtPeriodEnd(sub.stripe_subscription_id);
    if (endsOn) {
      await db.from("website_subscriptions").update({ cancel_at_period_end: true, current_period_end: endsOn, updated_at: new Date().toISOString() }).eq("id", sub.id);
      await db.from("website_cancellation_requests").update({ status: "processed", processed_at: new Date().toISOString() }).eq("subscription_id", sub.id).eq("status", "open");
      processed = true;
    }
  }

  // Emails are best effort: the request is recorded either way.
  const config = notificationMailConfig();
  if (config) {
    const message = cancelRequestEmail({
      reference: sub.reference,
      name: sub.name,
      packageName: sub.package_name,
      kind: "subscription",
      setupPence: 0,
      monthlyPence: sub.monthly_pence,
      oneOffPence: 0,
      ownershipAfterPayments: sub.ownership_after_payments,
      minimumTermMonths: sub.minimum_term_months,
      endsOn: endsOn ?? undefined,
    });
    await sendEmail(config, { to: sub.email, subject: message.subject, text: message.text }, "Cancellation request").catch(() => false);
    const staff = process.env.ENQUIRY_TO_EMAIL?.trim();
    if (staff) {
      await sendEmail(
        config,
        {
          to: staff,
          subject: `[WINJO DIGITAL payments] Cancellation requested ${sub.reference}`,
          text: processed
            ? `${sub.reference}: ${sub.name} asked to cancel their ${sub.package_name} plan. It ends on ${endsOn}, and Stripe has been told.${reason ? `\nWhy: ${reason}` : ""}`
            : `${sub.reference}: ${sub.name} asked to cancel their ${sub.package_name} plan from their account, but it could not be set in Stripe automatically.${reason ? `\nWhy: ${reason}` : ""}\n\nPlease process it in the admin.`,
        },
        "Cancellation alert",
      ).catch(() => false);
    }
  }
  return NextResponse.json({ ok: true, endsOn, processed });
}
