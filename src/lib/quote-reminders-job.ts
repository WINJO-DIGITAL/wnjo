import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { notificationMailConfig, sendEmail } from "@/lib/mailer";
import { reminderCutoff, reminderEmail } from "@/lib/quote-reminder";
import { siteUrl } from "@/lib/site";

/**
 * Sends one reminder to each customer whose quote has been open for a few days. Each quote is marked when its reminder
 * goes out, so it is never reminded twice; a failed send leaves it for the next run.
 */
export async function sendQuoteReminders(db: SupabaseClient, now: Date = new Date(), limit = 20) {
  const config = notificationMailConfig();
  if (!config) return { sent: 0, skipped: 0, reason: "mail not configured" as const };
  const base = siteUrl() ?? "https://winjodigital.co.uk";

  const { data: due, error } = await db
    .from("quotes")
    .select("id, reference, organization_id")
    .eq("status", "sent")
    .is("reminded_at", null)
    .lt("created_at", reminderCutoff(now))
    .limit(limit);
  if (error) throw new Error(`Could not read open quotes: ${error.message}`);

  let sent = 0;
  let skipped = 0;
  for (const quote of (due ?? []) as Array<{ id: string; reference: string; organization_id: string | null }>) {
    if (!quote.organization_id) {
      skipped += 1;
      continue;
    }
    const { data: members } = await db.from("organization_members").select("user_id").eq("organization_id", quote.organization_id);
    const first = (members ?? []) as Array<{ user_id: string }>;
    const { data: userRow } = first[0] ? await db.auth.admin.getUserById(first[0].user_id) : { data: { user: null } };
    const email = userRow.user?.email;
    if (!email) {
      skipped += 1;
      continue;
    }
    const name = (userRow.user?.user_metadata?.full_name as string | undefined) ?? email.split("@")[0];
    const message = reminderEmail({ name, quoteReference: quote.reference, siteUrl: base });
    const ok = await sendEmail(config, { to: email, subject: message.subject, text: message.text }, "Reminder");
    if (!ok) {
      skipped += 1;
      continue;
    }
    await db.from("quotes").update({ reminded_at: now.toISOString() }).eq("id", quote.id);
    sent += 1;
  }
  return { sent, skipped };
}
