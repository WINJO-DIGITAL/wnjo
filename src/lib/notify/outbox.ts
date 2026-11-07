/**
 * Sends the customer emails that the database queued in notifications (email_wanted, not yet sent). The email
 * is plain text and links back to the site, so no account detail is put in the message beyond the notice itself.
 * Each row is marked sent only after the email is accepted; a failure leaves it to be tried again.
 */

export type OutboxRow = { id: string; recipient_user_id: string; title: string; body: string; link: string | null; email_attempts: number };

/** A notification that has failed this many times is left for a person to look at, rather than retried forever. */
export const MAX_EMAIL_ATTEMPTS = 5;

export function buildNotificationEmail(row: Pick<OutboxRow, "title" | "body" | "link">, siteUrl: string): { subject: string; text: string } {
  const base = siteUrl.replace(/\/+$/, "");
  const target = `${base}${row.link ?? "/account"}`;
  const lines = [row.body.trim(), "", `Open your account: ${target}`, "", "WNJO"].filter((line, i, all) => !(line === "" && all[i - 1] === ""));
  return { subject: row.title, text: lines.join("\n") };
}

export type OutboxPorts = {
  /** Oldest unsent, email-wanted notifications with attempts left, first. */
  loadUnsent: (limit: number) => Promise<OutboxRow[]>;
  /** The sign-in address of a recipient, or null when there is none. */
  emailFor: (userId: string) => Promise<string | null>;
  send: (to: string, email: { subject: string; text: string }) => Promise<boolean>;
  markSent: (id: string, at: Date) => Promise<void>;
  /** Counts a failed attempt, so a row that keeps failing eventually stops being retried. */
  markFailed: (row: OutboxRow) => Promise<void>;
};

export async function sendOutbox(
  ports: OutboxPorts,
  options: { siteUrl: string; limit?: number; now?: Date },
): Promise<{ sent: number; failed: number; skipped: number }> {
  const rows = await ports.loadUnsent(options.limit ?? 20);
  let sent = 0;
  let failed = 0;
  let skipped = 0;
  for (const row of rows) {
    const to = await ports.emailFor(row.recipient_user_id);
    if (!to) {
      await ports.markFailed(row);
      skipped += 1;
      continue;
    }
    const ok = await ports.send(to, buildNotificationEmail(row, options.siteUrl));
    if (!ok) {
      await ports.markFailed(row);
      failed += 1;
      continue;
    }
    await ports.markSent(row.id, options.now ?? new Date());
    sent += 1;
  }
  return { sent, failed, skipped };
}
