/**
 * How a website subscription's cancellation is tracked. Stripe is the source of truth: its webhooks say when a cancel
 * was asked for, withdrawn, or took effect, and its own reason is recorded with it. This module turns those changes
 * into log entries and staff alerts. Pure, apart from the one insert, so it can be tested without Stripe.
 */

export type CancellationKind = "cancel_requested" | "cancel_withdrawn" | "ended" | "payment_failed";

/** The reasons Stripe gives, in words staff can read. Anything unknown is shown as "No reason given". */
const STRIPE_REASONS: Record<string, string> = {
  cancellation_requested: "Customer asked to cancel",
  payment_failed: "Payment failed",
  payment_disputed: "Payment disputed",
};

/** The reason the customer picked, when they gave one (Stripe's cancellation feedback). */
const FEEDBACK: Record<string, string> = {
  too_expensive: "Too expensive",
  missing_features: "Missing features",
  switched_service: "Switched to another service",
  unused: "Not using it",
  customer_service: "Customer service",
  too_complex: "Too complicated",
  low_quality: "Quality was not good enough",
  other: "Something else",
};

/** A short reason for the log, from Stripe's cancellation details. Empty when Stripe gave none. */
export function cancellationReason(obj: Record<string, unknown>): string {
  const details = (obj.cancellation_details ?? {}) as { reason?: unknown; feedback?: unknown; comment?: unknown };
  const reason = typeof details.reason === "string" ? STRIPE_REASONS[details.reason] : undefined;
  const feedback = typeof details.feedback === "string" ? FEEDBACK[details.feedback] : undefined;
  const comment = typeof details.comment === "string" ? details.comment.replace(/<[^>]*>/g, "").trim().slice(0, 300) : "";
  return [reason, feedback, comment].filter(Boolean).join(" · ");
}

/** What changed in a subscription update: a cancel asked for, or withdrawn. Null when nothing about cancelling changed. */
export function cancelTransition(wasCancelling: boolean, isCancelling: boolean): "cancel_requested" | "cancel_withdrawn" | null {
  if (!wasCancelling && isCancelling) return "cancel_requested";
  if (wasCancelling && !isCancelling) return "cancel_withdrawn";
  return null;
}

/** Staff-facing wording for each log kind. */
export const KIND_LABEL: Record<CancellationKind, string> = {
  cancel_requested: "Cancellation requested",
  cancel_withdrawn: "Cancellation withdrawn",
  ended: "Subscription ended",
  payment_failed: "Payment failed",
};

/** Whether this kind needs a person to look at it the day it happens. */
export function needsStaffAlert(kind: CancellationKind): boolean {
  return kind === "cancel_requested" || kind === "ended" || kind === "payment_failed";
}

/**
 * Writes one log entry. A repeated Stripe event is ignored, so retries can't double-count. Returns true when this call
 * wrote the entry (so the caller knows whether to alert), false when it was already there, or "error".
 */
export async function logSubscriptionEvent(
  db: unknown,
  row: { id: string; tenant_id: string },
  kind: CancellationKind,
  reason: string,
  stripeEventId: string,
): Promise<boolean | "error"> {
  const client = db as {
    from(table: string): {
      upsert(
        row: Record<string, unknown>,
        options: { onConflict: string; ignoreDuplicates: boolean },
      ): { select(columns: string): Promise<{ data: unknown[] | null; error: unknown }> };
    };
  };
  const { data, error } = await client
    .from("website_subscription_events")
    .upsert(
      { tenant_id: row.tenant_id, subscription_id: row.id, kind, reason, stripe_event_id: stripeEventId },
      { onConflict: "stripe_event_id", ignoreDuplicates: true },
    )
    .select("id");
  if (error) return "error";
  return Array.isArray(data) && data.length > 0;
}
