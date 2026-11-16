import "server-only";

/**
 * Delivers enquiries to the business inboxes through Resend's HTTP API.
 * Configuration lives in server-only environment variables (see .env.example).
 * Customer emails go out in the branded layout (see email-layout.ts) with the plain text as the fallback. Every
 * piece of visitor input is escaped there, and staff alerts are sent as plain text only.
 */
import { renderEmailHtml } from "./email-layout";
import { isProductionMail, isReservedRecipient } from "./mail-guard";

/** One @, a local part, and a host with a dot. Enough to drop blanks and junk; Resend still checks the rest. */
const BASIC_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type MailConfig = { apiKey: string; to: string | string[]; from: string };

/**
 * Addresses in ENQUIRY_TO_EMAIL. Commas separate them. Each one is trimmed, blanks are dropped, and anything that
 * does not look like an email is dropped. A single address comes back as a one-item list.
 */
export function parseEnquiryRecipients(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter((part) => BASIC_EMAIL.test(part));
}

/**
 * Staff inboxes from ENQUIRY_TO_EMAIL. One address stays a string, so a single inbox is sent exactly as before.
 * Several addresses are an array for one Resend call. None is null.
 */
export function enquiryTo(): string | string[] | null {
  const recipients = parseEnquiryRecipients(process.env.ENQUIRY_TO_EMAIL);
  if (recipients.length === 1) return recipients[0];
  return recipients.length > 1 ? recipients : null;
}

export function mailConfig(): MailConfig | null {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const to = enquiryTo();
  const from = process.env.ENQUIRY_FROM_EMAIL?.trim();
  return apiKey && to && from ? { apiKey, to, from } : null;
}

/** Sender for customer emails (progress updates and the like). Uses the same Resend key and sender address. */
export function notificationMailConfig(): { apiKey: string; from: string } | null {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.ENQUIRY_FROM_EMAIL?.trim();
  return apiKey && from ? { apiKey, from } : null;
}

export async function sendEnquiryEmail(
  config: MailConfig,
  message: { subject: string; text: string; replyTo: string },
): Promise<boolean> {
  return sendEmail(config, { to: config.to, subject: message.subject, text: message.text, replyTo: message.replyTo, internal: true }, "Enquiry");
}

/**
 * Sends one email through Resend, with the branded HTML layout and the plain text as the fallback. Set `internal` for
 * staff alerts, which stay plain. Returns false on any failure, and logs only the status.
 */
export async function sendEmail(
  config: { apiKey: string; from: string },
  message: { to: string | readonly string[]; subject: string; text: string; replyTo?: string; internal?: boolean; attachments?: { filename: string; content: string }[] },
  label = "Email",
): Promise<boolean> {
  const listed = Array.isArray(message.to) ? [...message.to] : [message.to];
  // Reserved addresses are judged one by one. The others still go in the same call.
  const deliverable = isProductionMail() ? listed.filter((address) => !isReservedRecipient(address)) : listed;
  if (isProductionMail() && deliverable.length < listed.length) {
    console.info(`${label} skipped: a reserved address was not emailed from production`);
    if (deliverable.length === 0) return true;
  }
  if (deliverable.length === 0) return false;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://winjodigital.co.uk";
  const html = message.internal ? undefined : renderEmailHtml({ subject: message.subject, text: message.text }, { siteUrl });
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: config.from,
        to: deliverable,
        reply_to: message.replyTo,
        subject: message.subject,
        text: message.text,
        ...(html ? { html } : {}),
        ...(message.attachments?.length ? { attachments: message.attachments } : {}),
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      // Log status only: the response body may echo personal data.
      console.error(`${label} delivery failed with status ${res.status}`);
    }
    return res.ok;
  } catch (error) {
    console.error(`${label} delivery failed:`, error instanceof Error ? error.name : "unknown error");
    return false;
  }
}
