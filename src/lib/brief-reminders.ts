import type { SupabaseClient } from "@supabase/supabase-js";
import { notificationMailConfig, sendEmail } from "./mailer";

/**
 * A paid website whose goals were never filled in. The customer is nudged once, a day after payment, to sign in and
 * tell us about it. Only briefs still waiting for those details are chosen, and each is reminded at most once (the
 * reminder is recorded as an event, so a second run skips it).
 */
export const REMINDER_AFTER_MS = 24 * 60 * 60 * 1000;
// Recorded as a "note" event (the kinds the database allows), tagged so it can be found again.
const REMINDER_KIND = "note";
const REMINDER_TAG = { reminder: "details" };
const WAITING_STAGES = ["brief_received", "reviewing", "awaiting_payment", "specification"];

export type ReminderCandidate = { id: string; reference: string; email: string; name: string; created_at: string; brief: { goals?: unknown[] } | null };

/** True for a brief that is still missing its goals, is old enough, and has not been reminded yet. */
export function needsDetailsReminder(c: ReminderCandidate, alreadySent: boolean, now: number): boolean {
  if (alreadySent) return false;
  if ((c.brief?.goals?.length ?? 0) > 0) return false;
  return now - new Date(c.created_at).getTime() >= REMINDER_AFTER_MS;
}

export function detailsReminderEmail(args: { name: string; reference: string; siteUrl: string }): { subject: string; text: string } {
  const first = args.name.trim().split(/\s+/)[0] || "there";
  return {
    subject: `Tell us about your website [${args.reference}]`,
    text: [
      `Hi ${first},`,
      "",
      `Thank you for paying for your website (reference ${args.reference}). We're ready to start designing it, but we need to know a little more first.`,
      "",
      "Sign in to your account and tell us your goals, the pages you need and the style you like. It takes a few minutes, and you can add files too.",
      "",
      `${args.siteUrl.replace(/\/+$/, "")}/account`,
      "",
      "WINJO DIGITAL",
    ].join("\n"),
  };
}

/** Sends the reminders due now. Returns how many were sent; a failed send is left for the next run. */
export async function sendBriefDetailsReminders(db: SupabaseClient, now = Date.now(), limit = 50): Promise<{ sent: number }> {
  const config = notificationMailConfig();
  if (!config) return { sent: 0 };
  const { data } = await db
    .from("website_briefs")
    .select("id, tenant_id, reference, email, name, created_at, brief")
    .eq("route", "package")
    .in("stage", WAITING_STAGES)
    .lte("created_at", new Date(now - REMINDER_AFTER_MS).toISOString())
    .order("created_at", { ascending: true })
    .limit(limit);
  const rows = (data ?? []) as (ReminderCandidate & { tenant_id: string })[];
  let sent = 0;
  for (const row of rows) {
    const { data: prior } = await db
      .from("website_brief_events")
      .select("id")
      .eq("brief_id", row.id)
      .eq("kind", REMINDER_KIND)
      .contains("detail", REMINDER_TAG)
      .limit(1)
      .maybeSingle();
    if (!needsDetailsReminder(row, Boolean(prior), now)) continue;
    const message = detailsReminderEmail({
      name: row.name,
      reference: row.reference,
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://winjodigital.co.uk",
    });
    const ok = await sendEmail(config, { to: row.email, subject: message.subject, text: message.text }, "Brief details reminder");
    if (!ok) continue;
    await db.from("website_brief_events").insert({
      tenant_id: row.tenant_id,
      brief_id: row.id,
      kind: REMINDER_KIND,
      detail: REMINDER_TAG,
      actor_type: "system",
    });
    sent += 1;
  }
  return { sent };
}
