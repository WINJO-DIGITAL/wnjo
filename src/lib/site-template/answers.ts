/**
 * The customer's answers to the sector questions, checked and turned into `CustomerFacts` for the build. Pure (no
 * database, no browser), so the form and the server apply the same rules. Typed text is kept as plain text.
 */
import type { SectorPreset } from "./presets";
import type { CustomerFacts, HoursItem, Look } from "./schema";
import { FIELD_LIMITS, LOOKS } from "./schema";

export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export type DayAnswer = { day: (typeof DAYS)[number]; closed?: boolean; open?: string; close?: string };

/** What the form sends. Everything is optional text here; `parseAnswers` decides what is acceptable. */
export type RawAnswers = {
  businessName?: string;
  servicesText?: string;
  hours?: DayAnswer[];
  highlights?: string[];
  phone?: string;
  email?: string;
  address?: string;
  look?: string;
  colour?: string;
};

export type ParsedAnswers = { ok: true; facts: CustomerFacts; look: Look; colour: string } | { ok: false; errors: Record<string, string> };

export const ANSWER_LIMITS = { businessName: 60, address: 160, email: 120, phone: 20, servicesText: 2000 } as const;

const text = (v: unknown): string => (typeof v === "string" ? v.replace(/<[^>]*>/g, "").replace(/[ \t]+/g, " ").trim() : "");

/**
 * One service per line. A price counts only when it has a £ sign or a separator before it ("Cut £22", "Cut - 22"),
 * so "Grade 2 cut" stays a name. Prices are stored as "£22" or "£22.50".
 */
export function parseServicesText(input: string): { services: { name: string; price?: string }[]; errors: string[] } {
  const services: { name: string; price?: string }[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const line of input.split(/\r?\n/).map((l) => text(l)).filter(Boolean)) {
    const m = line.match(/^(.+?)\s*(?:[-–—:]\s*£?\s*|£\s*)(\d{1,4}(?:\.\d{1,2})?)$/);
    const name = (m ? m[1] : line).replace(/[-–—:\s]+$/, "").trim();
    const price = m ? `£${Number(m[2]).toFixed(Number(m[2]) % 1 === 0 ? 0 : 2)}` : undefined;
    if (!name) continue;
    if (name.length > FIELD_LIMITS.itemName) {
      errors.push(`"${name.slice(0, 30)}…" is too long. Keep each service under ${FIELD_LIMITS.itemName} characters.`);
      continue;
    }
    if (seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    services.push({ name, ...(price ? { price } : {}) });
  }
  if (services.length > FIELD_LIMITS.items) errors.push(`Add up to ${FIELD_LIMITS.items} services.`);
  return { services: services.slice(0, FIELD_LIMITS.items), errors };
}

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Joins runs of days with the same times, so Monday to Friday 09:00 to 18:00 reads as one row. */
export function groupHours(days: DayAnswer[]): HoursItem[] {
  const rows: { first: string; last: string; key: string; item: Omit<HoursItem, "day"> }[] = [];
  for (const d of days) {
    const item = d.closed ? { closed: true } : { open: d.open, close: d.close };
    const key = JSON.stringify(item);
    const prev = rows[rows.length - 1];
    if (prev && prev.key === key) prev.last = d.day;
    else rows.push({ first: d.day, last: d.day, key, item });
  }
  return rows.map((r) => ({ day: r.first === r.last ? r.first : r.last === DAYS[DAYS.indexOf(r.first as (typeof DAYS)[number]) + 1] ? `${r.first}, ${r.last}` : `${r.first} to ${r.last}`, ...r.item }));
}

const PHONE = /^\+?[\d\s()-]{9,16}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const COLOUR = /^#[0-9a-f]{6}$/i;

export function parseAnswers(raw: RawAnswers, preset: SectorPreset, defaults: { colour: string }): ParsedAnswers {
  const errors: Record<string, string> = {};

  const businessName = text(raw.businessName);
  if (!businessName) errors.businessName = "Add your business name.";
  else if (businessName.length > ANSWER_LIMITS.businessName) errors.businessName = `Keep it under ${ANSWER_LIMITS.businessName} characters.`;

  const { services, errors: serviceErrors } = parseServicesText(typeof raw.servicesText === "string" ? raw.servicesText.slice(0, ANSWER_LIMITS.servicesText) : "");
  if (services.length === 0) errors.services = "Add at least one service.";
  else if (serviceErrors.length) errors.services = serviceErrors[0];

  // Hours: every day answered, either closed or with open and close times.
  const days = Array.isArray(raw.hours) ? raw.hours : [];
  const byDay = new Map(days.map((d) => [d?.day, d]));
  const ordered: DayAnswer[] = [];
  let hoursError = "";
  for (const day of DAYS) {
    const d = byDay.get(day);
    if (!d) {
      hoursError = `Say whether you are open on ${day}.`;
      break;
    }
    if (d.closed) {
      ordered.push({ day, closed: true });
      continue;
    }
    const open = text(d.open);
    const close = text(d.close);
    if (!TIME.test(open) || !TIME.test(close)) {
      hoursError = `Add opening and closing times for ${day}, such as 09:00 and 18:00.`;
      break;
    }
    if (close <= open) {
      hoursError = `${day} closes before it opens.`;
      break;
    }
    ordered.push({ day, open, close });
  }
  if (hoursError) errors.hours = hoursError;

  const phone = text(raw.phone);
  const email = text(raw.email).toLowerCase();
  const address = text(raw.address);
  if (phone && !PHONE.test(phone)) errors.phone = "Check the phone number.";
  if (email && !EMAIL.test(email)) errors.email = "Check the email address.";
  if (email.length > ANSWER_LIMITS.email) errors.email = "That email address is too long.";
  if (address.length > ANSWER_LIMITS.address) errors.address = `Keep it under ${ANSWER_LIMITS.address} characters.`;
  if (!phone && !email) errors.contact = "Add a phone number or an email address.";

  const ticked = new Set(Array.isArray(raw.highlights) ? raw.highlights : []);
  const highlights = preset.highlights.filter((h) => ticked.has(h.id)).map((h) => ({ value: h.value, label: h.label }));

  const look = (LOOKS as readonly string[]).includes(raw.look ?? "") ? (raw.look as Look) : preset.defaultLook;
  const colourInput = text(raw.colour);
  if (colourInput && !COLOUR.test(colourInput)) errors.colour = "Pick a colour from the swatches.";
  const colour = COLOUR.test(colourInput) ? colourInput.toLowerCase() : defaults.colour;

  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    look,
    colour,
    facts: {
      businessName,
      services,
      hours: groupHours(ordered),
      ...(highlights.length ? { highlights } : {}),
      ...(phone ? { phone } : {}),
      ...(email ? { email } : {}),
      ...(address ? { address } : {}),
    },
  };
}
