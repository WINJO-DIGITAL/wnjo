/**
 * A booking request from the public form on a customer's template site. Pure (no network, no database), so the route
 * and the tests share the same rules. Everything typed is plain text; it goes into a plain-text email and is never
 * rendered as HTML.
 */

export const ENQUIRY_LIMITS = { name: 80, contact: 120, message: 1000 } as const;

export type SiteEnquiry = { name: string; contact: string; message: string };
export type ParsedEnquiry = { ok: true; enquiry: SiteEnquiry } | { ok: false; reason: string; spam?: boolean };

const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE = /^\+?[\d\s()-]{9,16}$/;

const clean = (v: unknown, max: number, multiline = false): string => {
  if (typeof v !== "string") return "";
  const text = v.replace(CONTROL, "").replace(/<[^>]*>/g, "");
  return (multiline ? text.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n") : text.replace(/\s+/g, " ")).trim().slice(0, max);
};

/** `website` is a field real visitors never see: anything in it means a bot filled the form in. */
export function parseSiteEnquiry(form: Record<string, unknown>): ParsedEnquiry {
  if (typeof form.website === "string" && form.website.trim() !== "") return { ok: false, reason: "spam", spam: true };
  const name = clean(form.name, ENQUIRY_LIMITS.name);
  const contact = clean(form.contact, ENQUIRY_LIMITS.contact);
  const message = clean(form.message, ENQUIRY_LIMITS.message, true);
  if (!name) return { ok: false, reason: "Add your name." };
  if (!EMAIL.test(contact) && !PHONE.test(contact)) return { ok: false, reason: "Add a phone number or email address we can reply to." };
  return { ok: true, enquiry: { name, contact, message } };
}

/** The email to the website's owner. The subject is one line, whatever the business is called. */
export function siteEnquiryEmail(args: { businessName: string; enquiry: SiteEnquiry }): { subject: string; text: string; replyTo?: string } {
  const business = args.businessName.replace(/\s+/g, " ").trim().slice(0, 80) || "your website";
  const { name, contact, message } = args.enquiry;
  return {
    subject: `New booking request for ${business}`,
    text: [
      `Someone asked for a booking through your website (${business}).`,
      "",
      `Name: ${name}`,
      `Phone or email: ${contact}`,
      message ? `\nWhat they asked for:\n${message}` : "They didn't add a message.",
      "",
      "Reply to them directly to confirm a time.",
      "",
      "WINJO DIGITAL",
    ].join("\n"),
    ...(EMAIL.test(contact) ? { replyTo: contact } : {}),
  };
}
