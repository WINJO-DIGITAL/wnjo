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
};

export const BARBER_PRESET: SectorPreset = {
  id: "barber",
  label: "Barber",
  defaultLook: "classic",
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

export const SECTOR_PRESETS: Record<string, SectorPreset> = {
  [BARBER_PRESET.id]: BARBER_PRESET,
};

export function presetFor(sector: string): SectorPreset | null {
  return SECTOR_PRESETS[sector] ?? null;
}
