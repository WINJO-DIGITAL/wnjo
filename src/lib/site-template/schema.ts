/**
 * The content of a template-based customer website. A template is a fixed layout of sections; the AI fills in the
 * content below and our own code lays it out. Every field is plain text with a length limit: no HTML, no scripts, no
 * links, so nothing the model writes can run in a visitor's browser. See docs/AI_BUILD_SPEC.md.
 */

/** The kinds of section a template can have. A sector preset chooses which ones appear, and in what order. */
import { LEGACY_LOOKS, STYLES } from "./styles";

export const SECTION_KINDS = ["hero", "services", "hours", "gallery", "facts", "area", "enquiry", "faq", "cta", "pagehead", "about"] as const;
export type SectionKind = (typeof SECTION_KINDS)[number];

/** The design of a site: one of the eight styles. The four older looks still draw, so sites built with them keep their look. */
export const LOOKS = [...STYLES, ...LEGACY_LOOKS] as const;
export type Look = (typeof LOOKS)[number];

/**
 * How the home page is arranged. "showcase" leads with a full-width photo and puts the gallery near the top, for
 * businesses people choose with their eyes. "split" sets the words beside the photo. "essentials" leads with the
 * words, the key facts and the price list, for businesses people choose on information.
 */
export const LAYOUTS = ["showcase", "split", "essentials"] as const;
export type Layout = (typeof LAYOUTS)[number];

/** The layout each sector starts on. The customer can pick another. */
const SECTOR_LAYOUT: Record<string, Layout> = {
  barber: "showcase",
  beauty: "showcase",
  massage: "showcase",
  fitness: "showcase",
  cafe: "showcase",
  "holiday-let": "showcase",
  building: "split",
  physio: "essentials",
  electrician: "essentials",
  plumbing: "essentials",
  cleaning: "essentials",
};
export const defaultLayout = (sector: string): Layout => SECTOR_LAYOUT[sector] ?? "showcase";

/** The most each text field may hold. The checks enforce these; the page layouts are designed to fit them. */
export const FIELD_LIMITS = {
  tagline: 100,
  headline: 120,
  intro: 300,
  heading: 80,
  body: 600,
  itemName: 60,
  itemText: 200,
  price: 20,
  question: 120,
  answer: 400,
  cta: 40,
  factValue: 24,
  factLabel: 60,
  alt: 120,
  prompt: 60,
  area: 40,
  areas: 8,
  items: 12,
} as const;

/** The most words in the places the model writes: the longest of our sample sites sets the bar. Short reads better. */
export const WORD_LIMITS = { headline: 8, intro: 18, sentence: 18 } as const;

export type ServiceItem = { name: string; description?: string; price?: string };
export type HoursItem = { day: string; open?: string; close?: string; closed?: boolean };
export type GalleryImage = { src: string; alt: string };
export type Fact = { value: string; label: string };
export type FaqItem = { question: string; answer: string };
/** A review the customer typed in themselves. Never written by the model. */
export type SuppliedReview = { quote: string; name: string; source?: string };

export type Section =
  | { kind: "hero"; variant: "photo" | "video" | "plain"; headline: string; intro: string; cta: string; image?: string }
  | { kind: "services"; heading: string; items: ServiceItem[]; /** On the home page of a multi-page site: show only this many, with a link to the full list. */ teaser?: number }
  | { kind: "hours"; heading: string; items: HoursItem[] }
  | { kind: "gallery"; heading: string; images: GalleryImage[] }
  | { kind: "facts"; items: Fact[] }
  | { kind: "area"; heading: string; text: string }
  | { kind: "enquiry"; heading: string; intro: string; cta: string; prompt?: string }
  | { kind: "faq"; heading: string; items: FaqItem[] }
  | { kind: "cta"; headline: string; cta: string }
  /** The top of every page after the first: its title and one line under it. */
  | { kind: "pagehead"; headline: string; intro: string }
  /** The customer's own words about the business, and their answers to the sector's questions, set out as points. */
  | { kind: "about"; heading: string; text: string; points: { label: string; text: string }[]; /** One of the customer's own photos, shown beside the text. Left out when they gave none to spare. */ image?: GalleryImage };

/** A page after the first. The first page is the content's own `sections`. */
export type SitePage = { slug: string; title: string; sections: Section[] };

export type BusinessDetails = {
  name: string;
  /** The customer's logo: a stored reference while the build is kept, a link once it is shown. Left out without one. */
  logo?: string;
  tagline?: string;
  phone?: string;
  email?: string;
  address?: string;
  /** WhatsApp number for the click-to-chat button. Left out, and the button hidden, when they didn't give one. */
  whatsapp?: string;
  /** Their Google Business Profile, as an https link. Left out when they didn't give one. */
  googleProfile?: string;
  /** Profile links (the Google Business Profile, social pages) for local business markup. */
  sameAs?: string[];
  /** Places they cover, exactly as they typed them. */
  areas?: string[];
};

export type SiteContent = {
  business: BusinessDetails;
  theme: { colour: string; look: Look; /** Left out on older builds, which show as "showcase". */ layout?: Layout };
  /** The home page. A one-page site has only this. */
  sections: Section[];
  /** The other pages of a multi-page site, in menu order. Absent for a one-page site. */
  pages?: SitePage[];
  /** Reviews the customer supplied. Absent when they gave none, so the section is not shown. */
  reviews?: SuppliedReview[];
};

/**
 * What the customer told us, in structured form. The checks compare the AI's output against this, so a price,
 * a phone number or an address the customer never gave can't appear on their site.
 */
export type CustomerFacts = {
  businessName: string;
  services: { name: string; price?: string; /** The customer's own words about it, kept as they wrote them. */ description?: string }[];
  hours?: HoursItem[];
  /** Short facts the customer ticked or typed, such as "Walk-ins welcome". Shown as the facts strip. */
  highlights?: Fact[];
  /** Places a trade covers, each named as the customer gave it. */
  areas?: string[];
  phone?: string;
  /** WhatsApp number for the click-to-chat button. Left out when they didn't give one. */
  whatsapp?: string;
  email?: string;
  address?: string;
  /** https link to their Google Business Profile. */
  googleProfile?: string;
  /** Other https profile links, for the site's local business markup. */
  sameAs?: string[];
  /** Reviews they pasted, word for word. Never invented. */
  reviews?: SuppliedReview[];
  /** The customer's own words on what makes the business different. The writer may rephrase it, never add to it. */
  about?: string;
  /** The customer's answers to the sector's own questions, each with the question it answers. */
  details?: { label: string; value: string; /** What the answer is called on the finished site. Falls back to the question. */ heading?: string }[];
};
