import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { notificationMailConfig, sendEmail } from "@/lib/mailer";
import { MAX_EMAIL_ATTEMPTS, sendOutbox, type OutboxRow } from "@/lib/notify/outbox";

/** Sends the queued customer emails now. Returns null when mail is not configured, so the caller can say so. */
export async function sendDueNotifications(db: SupabaseClient, siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://www.wnjoweb.co.uk") {
  const config = notificationMailConfig();
  if (!config) return null;
  const emails = new Map<string, string | null>();
  return sendOutbox(
    {
      loadUnsent: async (limit) => {
        const { data, error } = await db
          .from("notifications")
          .select("id, recipient_user_id, title, body, link, email_attempts")
          .eq("email_wanted", true)
          .is("sent_at", null)
          .lt("email_attempts", MAX_EMAIL_ATTEMPTS)
          .order("created_at", { ascending: true })
          .limit(limit);
        if (error) throw new Error(`Could not read the email queue: ${error.message}`);
        return (data ?? []) as OutboxRow[];
      },
      emailFor: async (userId) => {
        if (emails.has(userId)) return emails.get(userId) ?? null;
        const { data } = await db.auth.admin.getUserById(userId);
        const email = data.user?.email ?? null;
        emails.set(userId, email);
        return email;
      },
      send: (to, email) => sendEmail(config, { to, subject: email.subject, text: email.text }, "Notification"),
      markSent: async (id, at) => {
        const { error } = await db.from("notifications").update({ sent_at: at.toISOString() }).eq("id", id);
        if (error) throw new Error(`Could not mark notification sent: ${error.message}`);
      },
      markFailed: async (row) => {
        const { error } = await db
          .from("notifications")
          .update({ email_attempts: row.email_attempts + 1 })
          .eq("id", row.id);
        if (error) throw new Error(`Could not count the failed email: ${error.message}`);
      },
    },
    { siteUrl },
  );
}
