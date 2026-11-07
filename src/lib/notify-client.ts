import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Asks the server to send the customer emails that a staff change has just queued. Best effort: a failure here
 * never blocks the staff member, and the daily sweep sends anything missed.
 */
export async function sendQueuedEmails(client: SupabaseClient): Promise<void> {
  try {
    const { data } = await client.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;
    await fetch("/api/notifications/send", { method: "POST", headers: { authorization: `Bearer ${token}` } });
  } catch {
    // Deliberately silent: the sweep is the safety net.
  }
}
