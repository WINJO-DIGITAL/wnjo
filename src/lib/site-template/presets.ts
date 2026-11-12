/**
 * A sector preset says which sections a sector's site has, in what order, which are required, and what the writer
 * should aim for in each. Barber is the first. A new sector is a new preset on the same sections.
 */
import type { Look, SectionKind } from "./schema";

export type SectionPreset = {
  kind: SectionKind;
  /** A site without this section fails the checks. */
  required: boolean;
  /** One line for the writer: what this section is for in this sector. */
  guidance: string;
};

/** A fact the customer can tick, shown as one tile in the facts strip. Nothing is shown unless they tick it. */
export type HighlightOption = { id: string; value: string; label: string };

export type SectorPreset = {
  id: string;
  label: string;
  defaultLook: Look;
  /** One line on the voice, passed to the writer. */
  voice: string;
  sections: SectionPreset[];
  highlights: HighlightOption[];
  /** What the customer's list is called in this sector, for the writer: "Services", "Menu items". */
  itemsLabel: string;
  /** Where "find us" comes from: the shop's address, or the areas a trade covers. */
  areaSource: "address" | "areas";
  /** The label on the free-text box of the request form. */
  enquiryPrompt: string;
};

export const BARBER_PRESET: SectorPreset = {
  id: "barber",
  label: "Barber",
  defaultLook: "classic",
  itemsLabel: "Services",
  areaSource: "address",
  enquiryPrompt: "When suits you?",
  voice: "Confident, friendly and plain. Short sentences. No hype and no slang.",
  highlights: [
    { id: "walk-ins", value: "Walk-ins", label: "Always welcome" },
    { id: "cards", value: "Card", label: "Payments taken" },
    { id: "kids", value: "Kids", label: "Cuts for children" },
    { id: "appointments", value: "Appointments", label: "Booked by request" },
  ],
  sections: [
    { kind: "hero", required: true, guidance: "Say what the shop does and where, in one headline. The call to action is booking." },
    { kind: "services", required: true, guidance: "The cuts and treatments the customer listed, each with their own price if they gave one." },
    { kind: "hours", required: true, guidance: "Opening hours exactly as the customer gave them." },
    { kind: "gallery", required: false, guidance: "Photos the customer uploaded, with short plain captions." },
    { kind: "facts", required: false, guidance: "Up to four short facts the customer told us, such as years open or walk-ins welcome. Never invent one." },
    { kind: "area", required: false, guidance: "Where the shop is and how to find it, from the address the customer gave." },
    { kind: "enquiry", required: true, guidance: "A request-a-booking form: the customer asks for a time and the shop replies." },
    { kind: "faq", required: false, guidance: "Up to four questions a new customer asks, answered only from facts the customer gave." },
    { kind: "cta", required: true, guidance: "A closing line that points back to booking." },
  ],
};

export const CAFE_PRESET: SectorPreset = {
  id: "cafe",
  label: "Café",
  defaultLook: "warm",
  itemsLabel: "Menu items",
  areaSource: "address",
  enquiryPrompt: "Date, time and how many of you?",
  voice: "Warm, welcoming and simple. Short sentences. Talk about the food and the room, never about hype.",
  highlights: [
    { id: "dogs", value: "Dogs", label: "Welcome inside" },
    { id: "vegan", value: "Vegan", label: "Options on the menu" },
    { id: "takeaway", value: "Takeaway", label: "Food and drink to go" },
    { id: "outdoor", value: "Outdoor", label: "Seating available" },
  ],
  sections: [
    { kind: "hero", required: true, guidance: "Say what the café is and where, in one headline. The call to action is booking a table." },
    { kind: "services", required: true, guidance: "The menu items the customer listed, each with their own price if they gave one. The heading should say menu." },
    { kind: "hours", required: true, guidance: "Opening hours exactly as the customer gave them." },
    { kind: "gallery", required: false, guidance: "Photos the customer uploaded, with short plain captions." },
    { kind: "facts", required: false, guidance: "Up to four short facts the customer told us, such as dogs welcome or vegan options. Never invent one." },
    { kind: "area", required: false, guidance: "Where the café is and how to find it, from the address the customer gave." },
    { kind: "enquiry", required: true, guidance: "A request-a-table form: the customer asks for a date, a time and a party size, and the café replies." },
    { kind: "faq", required: false, guidance: "Up to four questions a new customer asks, answered only from facts the customer gave." },
    { kind: "cta", required: true, guidance: "A closing line that points back to booking a table." },
  ],
};

export const ELECTRICIAN_PRESET: SectorPreset = {
  id: "electrician",
  label: "Electrician",
  defaultLook: "bold",
  itemsLabel: "Services",
  areaSource: "areas",
  enquiryPrompt: "What do you need doing?",
  voice: "Direct, calm and reassuring. Short sentences. Say what is done and where, with no jargon and no big promises.",
  highlights: [
    { id: "free-quotes", value: "Free", label: "Quotes" },
    { id: "same-day", value: "Same day", label: "Call-outs available" },
    { id: "insured", value: "Insured", label: "Public liability cover" },
    { id: "certificates", value: "Certificates", label: "Provided for notifiable work" },
  ],
  sections: [
    { kind: "hero", required: true, guidance: "Say what the electrician does and where, in one headline. The call to action is asking for a quote." },
    { kind: "services", required: true, guidance: "The jobs the customer listed, each with their own price if they gave one." },
    { kind: "facts", required: false, guidance: "Up to four short facts the customer told us, such as free quotes or same-day call-outs. Never invent one, and never claim a registration or qualification." },
    { kind: "gallery", required: false, guidance: "Photos of work the customer uploaded, with short plain captions." },
    { kind: "area", required: true, guidance: "The areas covered. Name each area exactly as the customer gave it and add no others." },
    { kind: "hours", required: false, guidance: "When the electrician is available, exactly as the customer gave it." },
    { kind: "enquiry", required: true, guidance: "A request-a-quote form: the customer describes the job and the electrician replies." },
    { kind: "faq", required: false, guidance: "Up to four questions a new customer asks, answered only from facts the customer gave." },
    { kind: "cta", required: true, guidance: "A closing line that points back to asking for a quote." },
  ],
};

export const SECTOR_PRESETS: Record<string, SectorPreset> = {
  [BARBER_PRESET.id]: BARBER_PRESET,
  [CAFE_PRESET.id]: CAFE_PRESET,
  [ELECTRICIAN_PRESET.id]: ELECTRICIAN_PRESET,
};

export function presetFor(sector: string): SectorPreset | null {
  return SECTOR_PRESETS[sector] ?? null;
}
