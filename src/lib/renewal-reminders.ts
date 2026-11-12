import type { SupabaseClient } from "@supabase/supabase-js";
import { notificationMailConfig, sendEmail } from "@/lib/mailer";
import { logSubscriptionEvent } from "./subscription-cancellation";
import { renewalReminderEmail, type SubscriptionEmailFacts } from "./website-emails";

/**
 * Reminders for monthly website plans. One goes out a set number of days before the minimum term ends, and one every six
 * months after, each saying what the customer pays and how to cancel. Each is recorded once, so a re-run never sends a
 * second. Timings are in one place here so they are easy to change.
 */
export const REMINDER_DAYS_BEFORE = 14;
export const REMINDER_EVERY_MONTHS = 6;
const DAY = 24 * 60 * 60 * 1000;

/** The same day, a number of months later, in UTC. A 31st that doesn't exist becomes the month's last day. */
export function addMonths(date: Date, months: number): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1, date.getUTCHours(), date.getUTCMinutes()));
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(date.getUTCDate(), last));
  return d;
}

export type ReminderCandidate = {
  kind: string;
  status: string;
  cancel_at_period_end?: boolean | null;
  first_payment_at: string | null;
  minimum_term_months: number;
};

/**
 * The reminder due now, if any: the date it is about (the end of the minimum term, or a six-monthly date after it) and
 * whether that date is the end of the minimum term. Null when none is due, or the plan is not running.
 */
export function reminderDue(sub: ReminderCandidate, now: Date): { date: string; isTermEnd: boolean } | null {
  if (sub.kind !== "subscription" || !(sub.status === "active" || sub.status === "past_due") || sub.cancel_at_period_end === true) return null;
  if (!sub.first_payment_at) return null;
  const start = new Date(sub.first_payment_at);
  if (Number.isNaN(start.getTime())) return null;
  const termEnd = addMonths(start, sub.minimum_term_months);
  // Check the term end and the next few six-monthly dates; one will fall in the window if any does.
  // A plan with no minimum term has no term end to remind about, so its first reminder is six months in.
  const hasTerm = sub.minimum_term_months > 0;
  for (let k = hasTerm ? 0 : 1; k < 400; k++) {
    const when = addMonths(termEnd, k * REMINDER_EVERY_MONTHS);
    const opens = when.getTime() - REMINDER_DAYS_BEFORE * DAY;
    if (now.getTime() < opens) return null;
    if (now.getTime() < when.getTime()) return { date: when.toISOString().slice(0, 10), isTermEnd: hasTerm && k === 0 };
  }
  return null;
}

const dateLabel = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

type Row = ReminderCandidate & {
  id: string;
  tenant_id: string;
  reference: string;
  email: string;
  name: string;
  package_name: string;
  monthly_pence: number;
  ownership_after_payments: number;
};

/** Sends the reminders due now. Returns how many were sent. A reminder is recorded first, so it can't go out twice. */
export async function sendRenewalReminders(db: SupabaseClient, now = new Date(), limit = 100): Promise<{ sent: number }> {
  const config = notificationMailConfig();
  if (!config) return { sent: 0 };
  const { data } = await db
    .from("website_subscriptions")
    .select("id, tenant_id, reference, kind, status, email, name, package_name, monthly_pence, ownership_after_payments, minimum_term_months, first_payment_at, cancel_at_period_end")
    .eq("kind", "subscription")
    .in("status", ["active", "past_due"])
    .not("first_payment_at", "is", null)
    .limit(limit);
  let sent = 0;
  for (const row of (data ?? []) as Row[]) {
    const due = reminderDue(row, now);
    if (!due) continue;
    const logged = await logSubscriptionEvent(db, row, "renewal_reminder", `Reminder for ${due.date}`, `reminder:${row.id}:${due.date}`);
    if (logged !== true) continue;
    const facts: SubscriptionEmailFacts = {
      reference: row.reference,
      name: row.name,
      packageName: row.package_name,
      kind: "subscription",
      setupPence: 0,
      monthlyPence: row.monthly_pence,
      oneOffPence: 0,
      ownershipAfterPayments: row.ownership_after_payments,
      minimumTermMonths: row.minimum_term_months,
    };
    const message = renewalReminderEmail(facts, process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://winjodigital.co.uk", due.isTermEnd ? dateLabel(due.date) : null);
    if (await sendEmail(config, { to: row.email, subject: message.subject, text: message.text }, "Renewal reminder")) sent += 1;
  }
  return { sent };
}
