import { KIND_LABEL, cancelTransition, cancellationReason, logSubscriptionEvent, needsStaffAlert } from "@/lib/subscription-cancellation";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  balanceReceivedEmail,
  cancelledEmail,
  oneOffPaidEmail,
  ownershipEmail,
  paymentFailedEmail,
  paymentReceivedEmail,
  welcomeEmail,
  type SubscriptionEmailFacts,
} from "./website-emails";
import { advanceAfterPayment } from "./brief-payment";
import { isHostingCode, type WebsiteStatus } from "./hosting-request";
import { firstPaymentPence, ownershipDue, statusFromStripe } from "./website-subscriptions";

/**
 * Stripe webhook events for website subscriptions and one-off website payments. The caller has already checked the
 * signature. Returns "ignored" for events that aren't ours (the deposit handler then gets its turn), "retry" when a
 * database error should make Stripe send the event again, or "handled".
 *
 * - A first payment must match the amounts on the offer, or nothing is activated and staff are told.
 * - Each paid invoice is recorded once, so the payment count and the ownership date are exact even when Stripe retries.
 * - Events can arrive in any order: an invoice can be matched by the subscription's own metadata.
 * - Emails go out only when this delivery made the change, never again on a retry.
 */

export type EventDeps = {
  /** Sends a plain-text email to the customer. Best effort. */
  emailCustomer: (to: string, message: { subject: string; text: string }) => Promise<unknown>;
  /** Tells staff about something a person should look at. Best effort. */
  alertStaff: (subject: string, detail: string) => Promise<unknown>;
};

type Row = {
  id: string;
  tenant_id: string;
  /** Whether a cancel is already set to take effect at the end of the period. Used to log changes once. */
  cancel_at_period_end?: boolean | null;
  reference: string;
  kind: "subscription" | "one_off";
  status: string;
  email: string;
  name: string;
  package_name: string;
  setup_pence: number;
  monthly_pence: number;
  one_off_pence: number;
  minimum_term_months: number;
  ownership_after_payments: number;
  ownership_eligible_at: string | null;
  enquiry_reference?: string | null;
  package_code?: string | null;
  quote_snapshot?: { hosting?: { siteUrl?: unknown; websiteStatus?: unknown } } | null;
};

const COLUMNS =
  "id, tenant_id, reference, kind, status, email, name, package_name, setup_pence, monthly_pence, one_off_pence, minimum_term_months, ownership_after_payments, ownership_eligible_at, enquiry_reference, cancel_at_period_end, package_code, quote_snapshot";

type StripeObject = Record<string, unknown>;
type StripeEvent = { id?: string; type?: string; livemode?: boolean; data?: { object?: StripeObject } };

const str = (v: unknown) => (typeof v === "string" ? v : null);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const meta = (o: unknown) => ((o && typeof o === "object" ? (o as { metadata?: unknown }).metadata : null) ?? {}) as Record<string, unknown>;

/** What a hosting-only plan was bought for, or null for anything else. */
function hostingOf(row: Row): { siteUrl: string; websiteStatus: WebsiteStatus } | null {
  if (!row.package_code || !isHostingCode(row.package_code)) return null;
  const h = row.quote_snapshot?.hosting;
  const status = h?.websiteStatus;
  return {
    siteUrl: typeof h?.siteUrl === "string" ? h.siteUrl : "",
    websiteStatus: status === "have" || status === "need" || status === "other" ? status : "other",
  };
}

function facts(row: Row, paymentsCount?: number): SubscriptionEmailFacts {
  const hosting = hostingOf(row);
  return {
    ...(hosting ? { hosting } : {}),
    reference: row.reference,
    name: row.name,
    packageName: row.package_name,
    kind: row.kind,
    setupPence: row.setup_pence,
    monthlyPence: row.monthly_pence,
    oneOffPence: row.one_off_pence,
    paymentsCount,
    ownershipAfterPayments: row.ownership_after_payments,
    minimumTermMonths: row.minimum_term_months,
  };
}

/** The subscription id on an invoice, across Stripe API versions. */
function invoiceSubscription(invoice: StripeObject): { id: string | null; metadata: Record<string, unknown> } {
  const direct = str(invoice.subscription);
  const parent = (invoice.parent as { subscription_details?: { subscription?: unknown; metadata?: unknown } } | undefined)
    ?.subscription_details;
  const legacy = invoice.subscription_details as { metadata?: unknown } | undefined;
  return {
    id: direct ?? str(parent?.subscription),
    metadata: ((parent?.metadata ?? legacy?.metadata) ?? {}) as Record<string, unknown>,
  };
}

/** Whether the customer still needs to fill in their goals. Yes when there is no brief yet, or it has no goals. */
async function briefNeedsDetails(db: SupabaseClient, tenantId: string, enquiryReference: string | null | undefined): Promise<boolean> {
  if (!enquiryReference) return true;
  const { data, error } = await db.from("website_briefs").select("brief").eq("tenant_id", tenantId).eq("reference", enquiryReference).maybeSingle();
  if (error) return true;
  const goals = (data as { brief?: { goals?: unknown } } | null)?.brief?.goals;
  return !(Array.isArray(goals) && goals.length > 0);
}

/**
 * The final payment on a website bought outright: records the date on the brief, once. Safe to run again for the same
 * payment. Returns "error" when the database failed, so the webhook asks Stripe to retry.
 */
async function markBalancePaid(db: SupabaseClient, row: Row): Promise<"ok" | "error"> {
  if (!row.enquiry_reference) return "ok";
  const { data, error } = await db
    .from("website_briefs")
    .update({ balance_paid_at: new Date().toISOString() })
    .eq("tenant_id", row.tenant_id)
    .eq("reference", row.enquiry_reference)
    .is("balance_paid_at", null)
    .select("id");
  if (error) return "error";
  const id = (data as { id: string }[] | null)?.[0]?.id;
  if (id) {
    await db.from("website_brief_events").insert({ tenant_id: row.tenant_id, brief_id: id, kind: "note", detail: { balance: "paid", reference: row.reference }, actor_type: "system" });
  }
  return "ok";
}

async function findRow(db: SupabaseClient, by: { id?: string | null; subscriptionId?: string | null }): Promise<Row | null | "error"> {
  if (by.id) {
    const { data, error } = await db.from("website_subscriptions").select(COLUMNS).eq("id", by.id).maybeSingle();
    if (error) return "error";
    if (data) return data as Row;
  }
  if (by.subscriptionId) {
    const { data, error } = await db
      .from("website_subscriptions")
      .select(COLUMNS)
      .eq("stripe_subscription_id", by.subscriptionId)
      .maybeSingle();
    if (error) return "error";
    if (data) return data as Row;
  }
  return null;
}

/** Records one payment; returns true if this call recorded it (false if it was already there), or "error". */
async function recordPayment(
  db: SupabaseClient,
  row: Row,
  reference: string,
  amountPence: number,
  billingReason: string | null,
): Promise<boolean | "error"> {
  const { data, error } = await db
    .from("website_subscription_payments")
    .upsert(
      { tenant_id: row.tenant_id, subscription_id: row.id, stripe_reference: reference, amount_pence: amountPence, billing_reason: billingReason },
      { onConflict: "stripe_reference", ignoreDuplicates: true },
    )
    .select("id");
  if (error) return "error";
  return Array.isArray(data) && data.length > 0;
}

/** Recounts payments from the ledger and sets the count, dates and the ownership date. */
async function refreshCounts(db: SupabaseClient, row: Row): Promise<{ count: number; ownershipNow: boolean } | "error"> {
  const { data, error } = await db.from("website_subscription_payments").select("paid_at").eq("subscription_id", row.id);
  if (error) return "error";
  const dates = ((data ?? []) as { paid_at: string }[]).map((p) => p.paid_at).sort();
  const due = row.kind === "subscription" ? ownershipDue(dates, row.ownership_after_payments) : null;
  // Decided before the update, so it reflects whether this payment is the one that reached ownership.
  const alreadyDue = Boolean(row.ownership_eligible_at);
  const { error: upError } = await db
    .from("website_subscriptions")
    .update({
      payments_count: dates.length,
      first_payment_at: dates[0] ?? null,
      last_payment_at: dates[dates.length - 1] ?? null,
      ownership_eligible_at: row.ownership_eligible_at ?? due,
      updated_at: new Date().toISOString(),
    })
    .eq("id", row.id);
  if (upError) return "error";
  return { count: dates.length, ownershipNow: !alreadyDue && Boolean(due) };
}

export async function handleWebsiteSubscriptionEvent(
  db: SupabaseClient,
  event: StripeEvent,
  deps: EventDeps,
): Promise<"ignored" | "handled" | "retry"> {
  const obj = event.data?.object ?? {};
  const type = event.type ?? "";

  if (type === "checkout.session.completed") {
    const offerId = str(meta(obj).website_subscription_id);
    if (!offerId) return "ignored";
    const row = await findRow(db, { id: offerId });
    if (row === "error") return "retry";
    if (!row) return "ignored";
    const paid = obj.payment_status === "paid" || obj.payment_status === "no_payment_required";
    if (!paid) return "handled";
    const amount = num(obj.amount_total);
    const currency = (str(obj.currency) ?? "").toLowerCase();
    if (amount !== firstPaymentPence({ ...row, setupPence: row.setup_pence, monthlyPence: row.monthly_pence, oneOffPence: row.one_off_pence }) || currency !== "gbp") {
      await deps.alertStaff(
        "Website payment does not match the offer",
        `Offer ${row.reference}, checkout ${str(obj.id)}: Stripe charged ${amount} ${currency}, but the offer expects a different amount. It has NOT been activated. Check it in Stripe before acting.`,
      );
      return "handled";
    }
    if (row.kind === "subscription") {
      const { data, error } = await db
        .from("website_subscriptions")
        .update({
          status: "active",
          stripe_checkout_session_id: str(obj.id),
          stripe_customer_id: str(obj.customer),
          stripe_subscription_id: str(obj.subscription),
          livemode: Boolean(event.livemode),
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id)
        .eq("status", "offered")
        .select("id");
      if (error) return "retry";
      if (Array.isArray(data) && data.length > 0) {
        const hosting = hostingOf(row);
        if (hosting) {
          // Hosting on its own has no website build behind it: no goals to collect and no build to move on.
          await deps.emailCustomer(row.email, welcomeEmail(facts(row)));
          await deps.alertStaff(
            `New ${row.package_name} subscription`,
            `${row.reference}: ${row.name} subscribed to ${row.package_name}. First payment ${amount / 100} GBP, then ${row.monthly_pence / 100} GBP a month. Their website: ${hosting.websiteStatus === "have" ? hosting.siteUrl || "(address not given)" : hosting.websiteStatus === "need" ? "they need one built" : "someone else is building it"}. Next: connect their hosting.`,
          );
          return "handled";
        }
        const needsDetails = await briefNeedsDetails(db, row.tenant_id, row.enquiry_reference);
        await deps.emailCustomer(row.email, welcomeEmail({ ...facts(row), needsDetails }));
        await advanceAfterPayment(db, row.tenant_id, row.enquiry_reference);
        await deps.alertStaff(
          `New ${row.package_name} subscription`,
          `${row.reference}: ${row.name} subscribed. First payment ${amount / 100} GBP, then ${row.monthly_pence / 100} GBP a month.`,
        );
      }
      return "handled";
    }
    // One-off website: record the single payment and mark the offer paid.
    const recorded = await recordPayment(db, row, str(obj.payment_intent) ?? str(obj.id) ?? row.id, amount, "one_off");
    if (recorded === "error") return "retry";
    const { error } = await db
      .from("website_subscriptions")
      .update({ status: "paid", stripe_checkout_session_id: str(obj.id), stripe_customer_id: str(obj.customer), livemode: Boolean(event.livemode), updated_at: new Date().toISOString() })
      .eq("id", row.id);
    if (error) return "retry";
    const counts = await refreshCounts(db, row);
    if (counts === "error") return "retry";
    // The final payment on a website bought outright. Set by our own checkout, so it can't come from the browser.
    // It never moves the build's stage and never asks for the goals again.
    if (str(meta(obj).payment_part) === "balance") {
      if ((await markBalancePaid(db, row)) === "error") return "retry";
      if (recorded) {
        await deps.emailCustomer(row.email, balanceReceivedEmail(facts(row)));
        await deps.alertStaff(
          "Final payment received",
          `${row.reference}: ${row.name} paid the final ${amount / 100} GBP for ${row.enquiry_reference ?? "their website"}. Next: hand the website over in Admin, Website builds.`,
        );
      }
      return "handled";
    }
    if (recorded) {
      const needsDetails = await briefNeedsDetails(db, row.tenant_id, row.enquiry_reference);
      await deps.emailCustomer(row.email, oneOffPaidEmail({ ...facts(row), needsDetails }));
      await advanceAfterPayment(db, row.tenant_id, row.enquiry_reference);
      await deps.alertStaff(`One-off website payment received`, `${row.reference}: ${row.name} paid ${amount / 100} GBP.`);
    }
    return "handled";
  }

  if (type === "invoice.paid" || type === "invoice.payment_failed") {
    const sub = invoiceSubscription(obj);
    if (!sub.id) return "ignored";
    const row = await findRow(db, { id: str(sub.metadata.website_subscription_id), subscriptionId: sub.id });
    if (row === "error") return "retry";
    if (!row) return "ignored";

    if (type === "invoice.payment_failed") {
      const { error } = await db
        .from("website_subscriptions")
        .update({ status: "past_due", updated_at: new Date().toISOString() })
        .eq("id", row.id)
        .neq("status", "cancelled");
      if (error) return "retry";
      const eventId = str(event.id);
      if (eventId) {
        const logged = await logSubscriptionEvent(db, row, "payment_failed", "Payment failed", eventId);
        if (logged === "error") console.error("Subscription history not recorded");
      }
      await deps.emailCustomer(row.email, paymentFailedEmail(facts(row), str(obj.hosted_invoice_url)));
      await deps.alertStaff("Website subscription payment failed", `${row.reference}: ${row.name}'s payment failed. Stripe will retry.`);
      return "handled";
    }

    const amount = num(obj.amount_paid) ?? 0;
    if (amount <= 0) return "handled";
    const invoiceId = str(obj.id);
    if (!invoiceId) return "handled";
    const recorded = await recordPayment(db, row, invoiceId, amount, str(obj.billing_reason));
    if (recorded === "error") return "retry";
    const counts = await refreshCounts(db, row);
    if (counts === "error") return "retry";
    if (row.status === "past_due") {
      await db.from("website_subscriptions").update({ status: "active" }).eq("id", row.id).eq("status", "past_due");
    }
    if (recorded) {
      // The first invoice is covered by the welcome email.
      if (str(obj.billing_reason) !== "subscription_create") {
        await deps.emailCustomer(row.email, paymentReceivedEmail(facts(row, counts.count), amount));
      }
      if (counts.ownershipNow) {
        await deps.emailCustomer(row.email, ownershipEmail(facts(row, counts.count)));
        await deps.alertStaff(
          "Website ownership milestone reached",
          `${row.reference}: ${row.name} has made ${counts.count} payments. Ownership of the agreed deliverables is now due.`,
        );
      }
    }
    return "handled";
  }

  if (type === "customer.subscription.updated" || type === "customer.subscription.deleted") {
    const subscriptionId = str(obj.id);
    const row = await findRow(db, { id: str(meta(obj).website_subscription_id), subscriptionId });
    if (row === "error") return "retry";
    if (!row) return "ignored";
    const deleted = type === "customer.subscription.deleted";
    // Read before the update changes the row, so a repeated update is recognised as no change.
    const wasCancelling = row.cancel_at_period_end === true;
    const status = deleted ? "cancelled" : statusFromStripe(str(obj.status) ?? undefined);
    const periodEnd =
      num(obj.current_period_end) ??
      num(((obj.items as { data?: { current_period_end?: unknown }[] } | undefined)?.data?.[0] ?? {}).current_period_end);
    const update: Record<string, unknown> = {
      cancel_at_period_end: obj.cancel_at_period_end === true,
      updated_at: new Date().toISOString(),
    };
    if (subscriptionId) update.stripe_subscription_id = subscriptionId;
    if (status) update.status = status;
    if (periodEnd) update.current_period_end = new Date(periodEnd * 1000).toISOString();
    if (deleted) update.cancelled_at = new Date().toISOString();
    const query = db.from("website_subscriptions").update(update).eq("id", row.id);
    const { data, error } = deleted ? await query.neq("status", "cancelled").select("id") : await query.select("id");
    if (error) return "retry";

    // Stripe is the source of truth; the log is what staff read. A cancel asked for or withdrawn is logged once, and
    // the day it's asked for, staff hear about it. The end of a subscription is logged once too.
    const reason = cancellationReason(obj);
    const eventId = str(event.id);
    const transition = deleted ? null : cancelTransition(wasCancelling, obj.cancel_at_period_end === true);
    // The end is logged only on the change that ends it (the update matched a row that wasn't cancelled yet).
    const endedNow = deleted && Array.isArray(data) && data.length > 0;
    if (eventId && (endedNow || transition)) {
      const kind = endedNow ? "ended" : transition!;
      const logged = await logSubscriptionEvent(db, row, kind, reason, eventId);
      // The log is a record for staff, not the source of truth. If it can't be written, say so and carry on, so a
      // history problem never makes Stripe keep retrying and blocks the subscription itself.
      if (logged === "error") console.error("Subscription history not recorded");
      if (logged === true && needsStaffAlert(kind)) {
        await deps.alertStaff(KIND_LABEL[kind], `${row.reference}: ${row.name}. ${KIND_LABEL[kind]}${reason ? ` (${reason})` : ""}.`);
      }
    }
    if (deleted && Array.isArray(data) && data.length > 0) {
      await deps.emailCustomer(row.email, cancelledEmail(facts(row)));
    }
    return "handled";
  }

  return "ignored";
}
