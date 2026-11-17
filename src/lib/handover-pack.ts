/**
 * What a customer gets when a website they bought outright is handed over: a checklist staff must complete first,
 * and a "website pack" with everything that can be given without our framework (section 9.3 of the terms): the
 * wording, the photos and logo, the colours and fonts, and the page structure. Pure, so it is tested without storage.
 */
import type { ContentSection, PageContent } from "@/lib/ai/website-content";
import type { Look, Section, SiteContent } from "@/lib/site-template/schema";
import type { ZipEntry } from "@/lib/zip";

/** What staff confirm before a website is handed over. The server refuses a handover until every one is ticked. */
export const HANDOVER_CHECKLIST = [
  { id: "domain", label: "The domain is registered in the customer's name, and its login details are with them" },
  { id: "address", label: "The finished website opens on its own address and looks right on a phone" },
  { id: "forms", label: "The booking or contact form has been tested and the enquiry arrived" },
  { id: "pack", label: "The website pack has been downloaded and checked" },
  { id: "hosting", label: "Hosting is agreed: we keep hosting it, or it has moved to the customer's own account" },
  { id: "signoff", label: "The customer has said they are happy with the finished website" },
] as const;
export type ChecklistId = (typeof HANDOVER_CHECKLIST)[number]["id"];

/** The checklist items not ticked. Anything that isn't a list of known ids counts as nothing ticked. */
export function missingChecklist(ticked: unknown): string[] {
  const done = new Set(Array.isArray(ticked) ? ticked.filter((t): t is string => typeof t === "string") : []);
  return HANDOVER_CHECKLIST.filter((item) => !done.has(item.id)).map((item) => item.label);
}

/** The typefaces each look uses (see `site-template/fonts.ts`). */
export const LOOK_FONTS: Record<Look, string> = {
  athletic: "Archivo (wide capitals) throughout",
  precision: "Manrope for headings, DM Sans for text",
  boutique: "Young Serif for headings, Hanken Grotesk for text",
  executive: "Jost throughout",
  hearth: "Playfair Display for headings, Inter for text",
  heritage: "Cormorant Garamond (capitals) for headings, Inter for text",
  tradesman: "Archivo (capitals) throughout",
  clinic: "Figtree throughout",
  classic: "Playfair Display for headings, Inter for text",
  warm: "Nunito throughout",
  bold: "Barlow Condensed (capitals) for headings, Inter for text",
  minimal: "Inter throughout",
};

const FONT_SOURCES = "All the typefaces are open source (SIL Open Font Licence) and free to download from fonts.google.com.";

function sectionLines(s: Section): string[] {
  switch (s.kind) {
    case "hero":
      return [s.headline, s.intro, `Button: ${s.cta}`];
    case "pagehead":
      return [s.headline, s.intro];
    case "services":
      return [s.heading, ...s.items.map((i) => `- ${i.name}${i.price ? ` (${i.price})` : ""}${i.description ? `: ${i.description}` : ""}`)];
    case "hours":
      return [s.heading, ...s.items.map((h) => `- ${h.day}: ${h.closed ? "closed" : [h.open, h.close].filter(Boolean).join(" to ")}`)];
    case "gallery":
      return [s.heading, ...s.images.filter((i) => i.alt).map((i) => `- Photo: ${i.alt}`)];
    case "facts":
      return s.items.map((f) => `- ${f.value} ${f.label}`);
    case "area":
      return [s.heading, s.text];
    case "enquiry":
      return [s.heading, s.intro, `Button: ${s.cta}`];
    case "faq":
      return [s.heading, ...s.items.flatMap((q) => [`Q: ${q.question}`, `A: ${q.answer}`])];
    case "cta":
      return [s.headline, `Button: ${s.cta}`];
    case "about":
      return [s.heading, s.text, ...s.points.map((p) => `- ${p.label}: ${p.text}`)];
  }
}

const block = (title: string, lines: string[]) => `${title}\n${"=".repeat(title.length)}\n\n${lines.filter((l) => l.trim()).join("\n")}\n`;

/** The wording of a template site, one file per page. The first page is the home page. */
export function siteWording(content: SiteContent): { file: string; text: string }[] {
  const pages = [{ slug: "home", title: "Home", sections: content.sections }, ...(content.pages ?? [])];
  return pages.map((p, i) => ({
    file: `wording/${String(i + 1).padStart(2, "0")}-${slugify(p.slug)}.txt`,
    text: block(p.title, p.sections.flatMap((s) => [...sectionLines(s), ""])),
  }));
}

const sectionText = (s: ContentSection) => [s.heading, s.body, ...(s.bullets ?? []).map((b) => `- ${b}`), ""];

/** The wording of an older words-only preview. */
export function previewWording(pages: readonly PageContent[], titles: ReadonlyMap<string, string> = new Map()): { file: string; text: string }[] {
  return pages.map((p, i) => ({
    file: `wording/${String(i + 1).padStart(2, "0")}-${slugify(p.slug)}.txt`,
    text: block(titles.get(p.slug) ?? p.slug, [p.headline, p.intro, "", ...p.sections.flatMap(sectionText), p.cta ? `Button: ${p.cta}` : ""]),
  }));
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "page";
}

/** A file name safe inside a zip: no folders, no odd characters. */
export function safeFileName(name: string): string {
  const cleaned = name.replace(/[\\/]+/g, "_").replace(/[^\w.\- ]+/g, "_").replace(/^\.+/, "").trim();
  return cleaned.slice(0, 80) || "file";
}

export function designNotes(content: SiteContent): string {
  const t = content.theme;
  return [
    "Colours and fonts",
    "=================",
    "",
    `Main colour: ${t.colour}`,
    `Look: ${t.look}`,
    `Fonts: ${LOOK_FONTS[t.look]}`,
    `Home page layout: ${t.layout ?? "showcase"}`,
    "",
    FONT_SOURCES,
    "",
    "Pages, in menu order:",
    ...[{ title: "Home" }, ...(content.pages ?? [])].map((p) => `- ${p.title}`),
    "",
  ].join("\n");
}

export type PackInput = {
  reference: string;
  businessName: string;
  /** The address the website is served on, if staff have attached one. */
  address?: string | null;
  site?: SiteContent | null;
  previewPages?: readonly PageContent[] | null;
  previewTitles?: ReadonlyMap<string, string>;
  /** Everything the customer uploaded: photos, logo and documents. */
  files: { name: string; data: Uint8Array }[];
  /** When the website was handed over, as text for the note. */
  handedOver?: string | null;
};

export function readme(input: PackInput): string {
  return [
    `${input.businessName}: your website pack`,
    "",
    `Reference: ${input.reference}`,
    input.handedOver ? `Handed over: ${input.handedOver}` : "",
    input.address ? `Your website: https://${input.address}` : "",
    "",
    "What is in this pack",
    "- wording/: every page's text, one file per page.",
    "- files/: the photos, logo and documents you gave us.",
    "- design.txt: your colours, fonts and the page list.",
    input.site ? "- site-content.json: the structure of your website, in a plain format other tools can read." : "",
    "",
    "What stays with us",
    "The framework your website runs on stays ours (terms, section 9.4). Your website carries on running there, and your",
    "wording, photos and brand are yours to take anywhere.",
    "",
    "Questions: hello@winjodigital.co.uk",
    "",
  ]
    .filter((l, i, all) => l !== "" || all[i - 1] !== "")
    .join("\n");
}

/** Every file in the pack. Duplicate photo names get a number so none is lost. */
export function packEntries(input: PackInput): ZipEntry[] {
  const entries: ZipEntry[] = [{ name: "README.txt", data: readme(input) }];
  const wording = input.site ? siteWording(input.site) : input.previewPages?.length ? previewWording(input.previewPages, input.previewTitles) : [];
  for (const w of wording) entries.push({ name: w.file, data: w.text });
  if (input.site) {
    entries.push({ name: "design.txt", data: designNotes(input.site) });
    entries.push({ name: "site-content.json", data: JSON.stringify(input.site, null, 2) });
  }
  const used = new Set<string>();
  for (const f of input.files) {
    const original = safeFileName(f.name);
    let name = original;
    for (let n = 2; used.has(name.toLowerCase()); n++) name = original.replace(/(\.[^.]*)?$/, (ext) => `-${n}${ext}`);
    used.add(name.toLowerCase());
    entries.push({ name: `files/${name}`, data: f.data });
  }
  return entries;
}
