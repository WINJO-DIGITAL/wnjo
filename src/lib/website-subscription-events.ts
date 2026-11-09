import type { SupabaseClient } from "@supabase/supabase-js";
import {
  cancelledEmail,
  oneOffPaidEmail,
  ownershipEmail,
  paymentFailedEmail,
  paymentReceivedEmail,
  welcomeEmail,
  type SubscriptionEmailFacts,
} from "./website-emails";
import { advanceAfterPayment } from "./brief-payment";
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
};

const COLUMNS =
  "id, tenant_id, reference, kind, status, email, name, package_name, setup_pence, monthly_pence, one_off_pence, minimum_term_months, ownership_after_payments, ownership_eligible_at, enquiry_reference";

type StripeObject = Record<string, unknown>;
type StripeEvent = { type?: string; livemode?: boolean; data?: { object?: StripeObject } };

const str = (v: unknown) => (typeof v === "string" ? v : null);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const meta = (o: unknown) => ((o && typeof o === "object" ? (o as { metadata?: unknown }).metadata : null) ?? {}) as Record<string, unknown>;

function facts(row: Row, paymentsCount?: number): SubscriptionEmailFacts {
  return {
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
        await deps.emailCustomer(row.email, welcomeEmail(facts(row)));
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
    if (recorded) {
      await deps.emailCustomer(row.email, oneOffPaidEmail(facts(row)));
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
    if (deleted && Array.isArray(data) && data.length > 0) {
      await deps.emailCustomer(row.email, cancelledEmail(facts(row)));
      await deps.alertStaff("Website subscription ended", `${row.reference}: ${row.name}'s subscription has ended.`);
    }
    return "handled";
  }

  return "ignored";
}
