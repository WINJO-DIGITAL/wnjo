/**
 * The customer's answers to the sector questions, checked and turned into `CustomerFacts` for the build. Pure (no
 * database, no browser), so the form and the server apply the same rules. Typed text is kept as plain text.
 */
import { ABOUT_QUESTION, type SectorPreset } from "./presets";
import type { CustomerFacts, HoursItem, Layout, Look, SuppliedReview } from "./schema";
import { defaultLayout, FIELD_LIMITS, LAYOUTS, LOOKS } from "./schema";

export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export type DayAnswer = { day: (typeof DAYS)[number]; closed?: boolean; open?: string; close?: string };

/** What the form sends. Everything is optional text here; `parseAnswers` decides what is acceptable. */
export type RawAnswers = {
  businessName?: string;
  servicesText?: string;
  hours?: DayAnswer[];
  highlights?: string[];
  phone?: string;
  /** WhatsApp number. Left blank when they don't want the button. */
  whatsapp?: string;
  email?: string;
  address?: string;
  /** Places they cover, separated by commas or new lines. Optional unless the sector asks for them. */
  areas?: string;
  /** https link to their Google Business Profile. */
  googleProfile?: string;
  /** Other https profile links, one per line. */
  links?: string;
  /** Reviews they want shown, one per line: the words, a dash, then who said it. */
  reviews?: string;
  /** In their own words: what makes the business different. */
  about?: string;
  /** Answers to the sector's own questions, by question id. */
  details?: Record<string, string>;
  look?: string;
  /** How the home page is arranged. Left out: the sector's own. */
  layout?: string;
  colour?: string;
};

export type ParsedAnswers = { ok: true; facts: CustomerFacts; look: Look; layout: Layout; colour: string } | { ok: false; errors: Record<string, string> };

export const ANSWER_LIMITS = { businessName: 60, address: 160, email: 120, phone: 20, servicesText: 2000, areasText: 300, aboutText: 400, detailText: 200, details: 8, googleProfile: 300, linksText: 1000, reviewsText: 2000, reviewQuote: 280, reviewName: 60, reviewSource: 40, reviews: 6, links: 6 } as const;

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
    // A price may have a comma (£2,900) and a unit after it ("£140 a night"); the unit is kept with the price.
    const m = line.match(/^(.+?)\s*(?:[-–—:]\s*£?\s*|£\s*)(\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\d{1,4}(?:\.\d{1,2})?)(\s+(?:a|an|per)\s+[a-z]+(?:\s+[a-z]+)?)?$/i);
    const name = (m ? m[1] : line).replace(/[-–—:\s]+$/, "").trim();
    const amount = m ? Number(m[2].replace(/,/g, "")) : 0;
    const unit = m?.[3] ? ` ${m[3].trim().toLowerCase()}` : "";
    const price = m ? `£${amount.toFixed(amount % 1 === 0 ? 0 : 2)}${unit}` : undefined;
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

/** An https address with no sign-in details. Anything else is refused rather than guessed. */
export function httpsUrl(value: string): string | null {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" || url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

/** Profile links, one per line. Blank is fine. A line that isn't an https link is an error. */
export function parseLinks(input: string): { links: string[]; error?: string } {
  const links: string[] = [];
  for (const line of input.split(/\r?\n/).map((l) => text(l)).filter(Boolean)) {
    const url = httpsUrl(line);
    if (!url) return { links: [], error: "Use a full link that starts with https://." };
    if (!links.includes(url)) links.push(url);
  }
  if (links.length > ANSWER_LIMITS.links) return { links: links.slice(0, ANSWER_LIMITS.links), error: `Add up to ${ANSWER_LIMITS.links} links.` };
  return { links };
}

/**
 * Reviews the customer typed, one per line: the words, then a dash, then who said them.
 * "Great cut — Sam, Google". Blank means they have none to show. A line we can't read is an error,
 * so a half-read review is never shown as if it were complete.
 */
export function parseReviews(input: string): { reviews: SuppliedReview[]; error?: string } {
  const reviews: SuppliedReview[] = [];
  for (const line of input.split(/\r?\n/).map((l) => text(l)).filter(Boolean)) {
    const parts = line.split(/\s+[—–|-]\s+|\s+\|\s+/);
    if (parts.length < 2) return { reviews: [], error: 'Write each review as the words, then a dash, then who said it. For example: Great cut — Sam, Google.' };
    const quote = parts[0].replace(/^["“]|["”]$/g, "").trim();
    const who = parts.slice(1).join(" - ").split(",");
    const name = who[0]?.trim() ?? "";
    const source = who.slice(1).join(",").trim();
    if (!quote || !name) return { reviews: [], error: "Each review needs the words and the name of the person who said them." };
    if (quote.length > ANSWER_LIMITS.reviewQuote) return { reviews: [], error: `Keep each review under ${ANSWER_LIMITS.reviewQuote} characters.` };
    if (name.length > ANSWER_LIMITS.reviewName || source.length > ANSWER_LIMITS.reviewSource) return { reviews: [], error: "Keep the name, and where it was posted, short." };
    reviews.push({ quote, name, ...(source ? { source } : {}) });
  }
  if (reviews.length > ANSWER_LIMITS.reviews) return { reviews: reviews.slice(0, ANSWER_LIMITS.reviews), error: `Add up to ${ANSWER_LIMITS.reviews} reviews.` };
  return { reviews };
}

/** The places a trade covers: one per comma or line, each kept as the customer typed it. */
export function parseAreas(input: string): { areas: string[]; error?: string } {
  const seen = new Set<string>();
  const areas: string[] = [];
  for (const part of input.split(/[,\n]/).map((a) => text(a)).filter(Boolean)) {
    if (seen.has(part.toLowerCase())) continue;
    seen.add(part.toLowerCase());
    areas.push(part);
  }
  if (areas.some((a) => a.length > FIELD_LIMITS.area)) return { areas: [], error: `Keep each area under ${FIELD_LIMITS.area} characters.` };
  if (areas.length > FIELD_LIMITS.areas) return { areas: areas.slice(0, FIELD_LIMITS.areas), error: `Add up to ${FIELD_LIMITS.areas} areas.` };
  return { areas };
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

/** Relative luminance of a hex colour (WCAG). */
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Prices and links are drawn in the colour on the site's paper. WCAG asks for 4.5:1 for text this size. */
export function readableOnPaper(hex: string): boolean {
  const paper = luminance("#fbfaf7");
  const ink = luminance(hex);
  return (Math.max(paper, ink) + 0.05) / (Math.min(paper, ink) + 0.05) >= 4.5;
}

export function parseAnswers(raw: RawAnswers, preset: SectorPreset, defaults: { colour: string }): ParsedAnswers {
  const errors: Record<string, string> = {};

  const businessName = text(raw.businessName);
  if (!businessName) errors.businessName = "Add your business name.";
  else if (businessName.length > ANSWER_LIMITS.businessName) errors.businessName = `Keep it under ${ANSWER_LIMITS.businessName} characters.`;

  const { services, errors: serviceErrors } = parseServicesText(typeof raw.servicesText === "string" ? raw.servicesText.slice(0, ANSWER_LIMITS.servicesText) : "");
  if (services.length === 0) errors.services = "Add at least one service.";
  else if (serviceErrors.length) errors.services = serviceErrors[0];

  // Hours: only for a sector that shows them. Required for a shop; optional for a trade, where blank means none given.
  const hoursSection = preset.sections.find((x) => x.kind === "hours");
  const days = Array.isArray(raw.hours) ? raw.hours : [];
  const untouched = days.every((d) => !d || (!d.closed && !text(d.open) && !text(d.close)));
  const ordered: DayAnswer[] = [];
  if (hoursSection && !(untouched && !hoursSection.required)) {
    const byDay = new Map(days.map((d) => [d?.day, d]));
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
  }

  // Areas: required where the sector is built around them, optional everywhere else. Blank means the section stays hidden.
  let areas: string[] = [];
  const areasInput = typeof raw.areas === "string" ? raw.areas.slice(0, ANSWER_LIMITS.areasText) : "";
  if (preset.areaSource === "areas" || text(areasInput)) {
    const parsedAreas = parseAreas(areasInput);
    areas = parsedAreas.areas;
    if (parsedAreas.error) errors.areas = parsedAreas.error;
    else if (preset.areaSource === "areas" && areas.length === 0) errors.areas = "Add the areas you cover.";
  }

  const phone = text(raw.phone);
  const whatsapp = text(raw.whatsapp);
  const email = text(raw.email).toLowerCase();
  const address = text(raw.address);
  if (phone && !PHONE.test(phone)) errors.phone = "Check the phone number.";
  if (whatsapp && !PHONE.test(whatsapp)) errors.whatsapp = "Check the WhatsApp number.";
  if (email && !EMAIL.test(email)) errors.email = "Check the email address.";
  if (email.length > ANSWER_LIMITS.email) errors.email = "That email address is too long.";
  if (address.length > ANSWER_LIMITS.address) errors.address = `Keep it under ${ANSWER_LIMITS.address} characters.`;
  if (!email) errors.email = "Add an email address we can reply to.";

  const ticked = new Set(Array.isArray(raw.highlights) ? raw.highlights : []);
  const highlights = preset.highlights.filter((h) => ticked.has(h.id)).map((h) => ({ value: h.value, label: h.label }));

  // In their own words, and the sector's own questions. The writer may use what they say and nothing more.
  const about = text(raw.about);
  if (!about) errors.about = `Answer "${ABOUT_QUESTION.label}" in a sentence or two.`;
  else if (about.length > ANSWER_LIMITS.aboutText) errors.about = `Keep it under ${ANSWER_LIMITS.aboutText} characters.`;
  const rawDetails = raw.details && typeof raw.details === "object" ? raw.details : {};
  const details: { label: string; value: string }[] = [];
  for (const q of preset.questions) {
    const value = text(rawDetails[q.id]);
    if (value.length > ANSWER_LIMITS.detailText) errors[`detail-${q.id}`] = `Keep it under ${ANSWER_LIMITS.detailText} characters.`;
    else if (!value && q.required) errors[`detail-${q.id}`] = "Answer this question.";
    else if (value) details.push({ label: q.label, value });
  }

  const profile = text(raw.googleProfile);
  let googleProfile = "";
  if (profile) {
    const url = httpsUrl(profile);
    if (!url || url.length > ANSWER_LIMITS.googleProfile) errors.googleProfile = "Use the full https link to your Google Business Profile.";
    else googleProfile = url;
  }
  const parsedLinks = parseLinks(typeof raw.links === "string" ? raw.links.slice(0, ANSWER_LIMITS.linksText) : "");
  if (parsedLinks.error) errors.links = parsedLinks.error;
  const parsedReviews = parseReviews(typeof raw.reviews === "string" ? raw.reviews.slice(0, ANSWER_LIMITS.reviewsText) : "");
  if (parsedReviews.error) errors.reviews = parsedReviews.error;

  const look = (LOOKS as readonly string[]).includes(raw.look ?? "") ? (raw.look as Look) : preset.defaultLook;
  const layout = (LAYOUTS as readonly string[]).includes(raw.layout ?? "") ? (raw.layout as Layout) : defaultLayout(preset.id);
  const colourInput = text(raw.colour);
  if (colourInput && !COLOUR.test(colourInput)) errors.colour = "Pick a colour from the swatches.";
  else if (COLOUR.test(colourInput) && !readableOnPaper(colourInput)) errors.colour = "That colour is too pale for the prices and links to read. Pick a darker one.";
  const colour = COLOUR.test(colourInput) ? colourInput.toLowerCase() : defaults.colour;

  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    look,
    layout,
    colour,
    facts: {
      businessName,
      services,
      ...(ordered.length ? { hours: groupHours(ordered) } : {}),
      ...(areas.length ? { areas } : {}),
      ...(highlights.length ? { highlights } : {}),
      about,
      ...(details.length ? { details } : {}),
      ...(phone ? { phone } : {}),
      ...(whatsapp ? { whatsapp } : {}),
      ...(email ? { email } : {}),
      ...(address ? { address } : {}),
      ...(googleProfile ? { googleProfile } : {}),
      ...(parsedLinks.links.length ? { sameAs: parsedLinks.links } : {}),
      ...(parsedReviews.reviews.length ? { reviews: parsedReviews.reviews } : {}),
    },
  };
}

/** What a brief stores for a template site: the sector and the answers, cleaned so the stored copy is always bounded. */
export type SiteAnswers = { sector: string; answers: RawAnswers };

const str = (v: unknown, max: number): string => (typeof v === "string" ? v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").slice(0, max) : "");

/**
 * Keeps only the fields the form can send, at their limits. It does not judge them: `parseAnswers` does that when a
 * site is built, so a half-finished draft can be saved. Unknown sectors are dropped.
 */
export function cleanSiteAnswers(input: unknown, knownSectors: string[]): SiteAnswers | null {
  if (!input || typeof input !== "object") return null;
  const o = input as Record<string, unknown>;
  const sector = typeof o.sector === "string" && knownSectors.includes(o.sector) ? o.sector : null;
  if (!sector) return null;
  const a = (o.answers && typeof o.answers === "object" ? o.answers : {}) as Record<string, unknown>;
  const hours: DayAnswer[] = [];
  if (Array.isArray(a.hours)) {
    for (const d of a.hours.slice(0, 7)) {
      const r = (d && typeof d === "object" ? d : {}) as Record<string, unknown>;
      const day = DAYS.find((x) => x === r.day);
      if (!day || hours.some((h) => h.day === day)) continue;
      hours.push(r.closed === true ? { day, closed: true } : { day, open: str(r.open, 5), close: str(r.close, 5) });
    }
  }
  const details: Record<string, string> = {};
  if (a.details && typeof a.details === "object") {
    for (const [key, value] of Object.entries(a.details as Record<string, unknown>).slice(0, ANSWER_LIMITS.details)) {
      if (/^[a-zA-Z0-9-]{1,30}$/.test(key) && typeof value === "string") details[key] = str(value, ANSWER_LIMITS.detailText);
    }
  }
  return {
    sector,
    answers: {
      businessName: str(a.businessName, ANSWER_LIMITS.businessName),
      servicesText: str(a.servicesText, ANSWER_LIMITS.servicesText),
      hours,
      highlights: Array.isArray(a.highlights) ? [...new Set(a.highlights.filter((h): h is string => typeof h === "string").map((h) => h.slice(0, 30)))].slice(0, 8) : [],
      phone: str(a.phone, ANSWER_LIMITS.phone),
      whatsapp: str(a.whatsapp, ANSWER_LIMITS.phone),
      email: str(a.email, ANSWER_LIMITS.email),
      address: str(a.address, ANSWER_LIMITS.address),
      areas: str(a.areas, ANSWER_LIMITS.areasText),
      googleProfile: str(a.googleProfile, ANSWER_LIMITS.googleProfile),
      links: str(a.links, ANSWER_LIMITS.linksText),
      reviews: str(a.reviews, ANSWER_LIMITS.reviewsText),
      about: str(a.about, ANSWER_LIMITS.aboutText),
      details,
      look: str(a.look, 20),
      layout: str(a.layout, 20),
      colour: str(a.colour, 7),
    },
  };
}
