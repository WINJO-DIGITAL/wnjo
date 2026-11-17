/**
 * The eight designs a customer's website can wear. A style is a whole design, not a colour scheme: its own type, its
 * own shapes and spacing, and its own way of laying out the top of the page, the lists and the closing band. Four come
 * from sites we built for clients; four from the sample designs on our own site. Nothing here depends on the kind of
 * business: any business can wear any style, and the words inside are always the customer's own.
 */
export const STYLES = ["athletic", "precision", "boutique", "executive", "hearth", "heritage", "tradesman", "clinic"] as const;
export type Style = (typeof STYLES)[number];

/** Designs used before the eight. They still draw, so a site built with one keeps its look. */
export const LEGACY_LOOKS = ["minimal", "warm", "bold", "classic"] as const;

export type StyleInfo = {
  label: string;
  /** Where the design comes from. */
  from: string;
  /** One line for the customer's picker. */
  blurb: string;
  /** Passed to the AI that picks a style, and to the writer as the tone to aim for. */
  tone: string;
  /** Dark styles put light text on a dark page. */
  dark: boolean;
};

export const STYLE_INFO: Record<Style, StyleInfo> = {
  athletic: {
    label: "Athletic",
    from: "RAENG Fitness",
    blurb: "Black and white, big capitals, hard edges.",
    tone: "direct, energetic and confident; short sentences",
    dark: false,
  },
  precision: {
    label: "Precision",
    from: "Duratek",
    blurb: "Deep navy and green, light type, plenty of space.",
    tone: "clear, capable and reassuring; plain and exact",
    dark: false,
  },
  boutique: {
    label: "Boutique",
    from: "Boonma",
    blurb: "Cream and plum, a friendly serif, soft curves.",
    tone: "warm, personal and welcoming; like talking to the owner",
    dark: false,
  },
  executive: {
    label: "Executive",
    from: "EV Exec",
    blurb: "Charcoal and gold, refined and quiet.",
    tone: "polished, discreet and premium; unhurried",
    dark: true,
  },
  hearth: {
    label: "Hearth",
    from: "Café sample",
    blurb: "Warm browns, a classic serif, inviting.",
    tone: "cosy, generous and sociable",
    dark: true,
  },
  heritage: {
    label: "Heritage",
    from: "Barber sample",
    blurb: "Near-black and brass, capital serif, traditional.",
    tone: "traditional, proud of the craft and assured",
    dark: true,
  },
  tradesman: {
    label: "Tradesman",
    from: "Electrician sample",
    blurb: "White and navy with a bright yellow stripe.",
    tone: "no-nonsense, dependable and quick to the point",
    dark: false,
  },
  clinic: {
    label: "Clinic",
    from: "Physio sample",
    blurb: "Soft sage and deep green, calm and airy.",
    tone: "calm, caring and professional; gentle reassurance",
    dark: false,
  },
};

/** A design a customer may choose. Legacy looks are drawn but never offered. */
export const isStyle = (value: unknown): value is Style => typeof value === "string" && (STYLES as readonly string[]).includes(value);
