/**
 * A booking request from the public form on a customer's template site. Pure (no network, no database), so the route
 * and the tests share the same rules. Everything typed is plain text; it goes into a plain-text email and is never
 * rendered as HTML.
 */

import type { Section } from "./schema";

export const ENQUIRY_LIMITS = { name: 80, contact: 120, message: 1000, service: 80 } as const;
export const PHOTO_MAX_BYTES = 2_000_000;
export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;

export type SiteEnquiry = { name: string; contact: string; message: string; service: string };
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
  const service = clean(form.service, ENQUIRY_LIMITS.service);
  if (!name) return { ok: false, reason: "Add your name." };
  if (!EMAIL.test(contact) && !PHONE.test(contact)) return { ok: false, reason: "Add a phone number or email address we can reply to." };
  return { ok: true, enquiry: { name, contact, message, service } };
}

/** The services named on the site, in the order they appear, with repeats dropped. */
export function serviceChoices(content: { sections?: Section[]; pages?: { sections?: Section[] }[] } | null): string[] {
  const names: string[] = [];
  const sections: Section[] = [...(content?.sections ?? []), ...(content?.pages ?? []).flatMap((page) => page.sections ?? [])];
  for (const section of sections) {
    if (section.kind !== "services") continue;
    for (const item of section.items) {
      const name = item.name.trim();
      if (name && !names.some((have) => have.toLowerCase() === name.toLowerCase())) names.push(name);
    }
  }
  return names.slice(0, 12);
}

/** The chosen service, only when it is one of the site's own. Anything else is dropped. */
export function matchService(choice: string, allowed: string[]): string {
  const wanted = choice.trim().toLowerCase();
  return allowed.find((name) => name.toLowerCase() === wanted) ?? "";
}

/** The email to the website's owner. The subject is one line, whatever the business is called. */
export function siteEnquiryEmail(args: { businessName: string; enquiry: SiteEnquiry; photo?: "attached" | "skipped" }): { subject: string; text: string; replyTo?: string } {
  const business = args.businessName.replace(/\s+/g, " ").trim().slice(0, 80) || "your website";
  const { name, contact, message, service } = args.enquiry;
  const photoLine = args.photo === "attached" ? "Photo: attached to this email." : args.photo === "skipped" ? "They tried to attach a photo, but it was too large or not a picture, so it isn't included." : "";
  return {
    subject: `New enquiry for ${business}`,
    text: [
      `Someone sent an enquiry through your website (${business}).`,
      "",
      `Name: ${name}`,
      `Phone or email: ${contact}`,
      ...(service ? [`Service: ${service}`] : []),
      ...(photoLine ? [photoLine] : []),
      "",
      message ? `What they asked for:\n${message}` : "They didn't add a message.",
      "",
      "Reply to them directly.",
      "",
      "WINJO DIGITAL",
    ].join("\n"),
    ...(EMAIL.test(contact) ? { replyTo: contact } : {}),
  };
}
