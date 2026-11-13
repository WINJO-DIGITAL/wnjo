import "server-only";

/**
 * Delivers enquiries to the business inbox through Resend's HTTP API.
 * Configuration lives in server-only environment variables (see .env.example).
 * Customer emails go out in the branded layout (see email-layout.ts) with the plain text as the fallback. Every
 * piece of visitor input is escaped there, and staff alerts are sent as plain text only.
 */
import { renderEmailHtml } from "./email-layout";

type MailConfig = { apiKey: string; to: string; from: string };

export function mailConfig(): MailConfig | null {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const to = process.env.ENQUIRY_TO_EMAIL?.trim();
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
  message: { to: string; subject: string; text: string; replyTo?: string; internal?: boolean },
  label = "Email",
): Promise<boolean> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://winjodigital.co.uk";
  const html = message.internal ? undefined : renderEmailHtml({ subject: message.subject, text: message.text }, { siteUrl });
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: config.from,
        to: [message.to],
        reply_to: message.replyTo,
        subject: message.subject,
        text: message.text,
        ...(html ? { html } : {}),
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
