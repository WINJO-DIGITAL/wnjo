/**
 * The customer's uploaded photos in a template site. The stored content holds only a reference to each private file;
 * the preview page swaps in short-lived signed links when it is opened, and only for files that belong to that
 * website's own brief. Pure, so it can be tested without storage.
 */
import type { BriefFile } from "@/lib/website-brief";
import type { GalleryImage, Section, SiteContent } from "./schema";

export const PHOTO_SCHEME = "brief-file:";
const PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
export const MAX_GALLERY = 6;

export const photoRef = (path: string) => `${PHOTO_SCHEME}${path}`;
export const isPhotoRef = (src: string) => src.startsWith(PHOTO_SCHEME);
export const photoPath = (ref: string) => ref.slice(PHOTO_SCHEME.length);

/** Photographs only (not SVG logos, documents, or files named like a logo). The first is the hero, the next few the gallery. */
/** A logo may also be a vector file: it is shown only as an image, never run as a document. */
const LOGO_TYPES = new Set([...PHOTO_TYPES, "image/svg+xml"]);

export function pickPhotos(files: BriefFile[]): { hero?: string; gallery: GalleryImage[]; logo?: string } {
  const logo = files.find((f) => f.role === "logo" && LOGO_TYPES.has(f.type));
  const photos = files.filter((f) => PHOTO_TYPES.has(f.type) && f.role !== "logo" && !(f.role === undefined && /logo/i.test(f.name)));
  // The picture the customer marked as the main one leads. Otherwise the first photo does.
  const chosen = photos.find((f) => f.role === "hero");
  const [first, ...rest] = chosen ? [chosen, ...photos.filter((f) => f !== chosen)] : photos;
  return {
    ...(first ? { hero: photoRef(first.path) } : {}),
    gallery: rest.slice(0, MAX_GALLERY).map((f) => ({ src: photoRef(f.path), alt: f.alt?.trim() ?? "" })),
    ...(logo ? { logo: photoRef(logo.path) } : {}),
  };
}

const allSections = (content: SiteContent): Section[] => [...content.sections, ...(content.pages ?? []).flatMap((p) => p.sections)];

/** The private files a build refers to, so the page knows what to sign. */
export function photoRefs(content: SiteContent): string[] {
  const refs: string[] = [];
  if (content.business.logo && isPhotoRef(content.business.logo)) refs.push(content.business.logo);
  for (const s of allSections(content)) {
    if (s.kind === "hero" && s.image && isPhotoRef(s.image)) refs.push(s.image);
    if (s.kind === "gallery") for (const im of s.images) if (isPhotoRef(im.src)) refs.push(im.src);
    if (s.kind === "about" && s.image && isPhotoRef(s.image.src)) refs.push(s.image.src);
  }
  return [...new Set(refs)];
}

/**
 * Swaps references for the links in `urls`. A reference with no link (missing or not the website's own file) is
 * dropped: a gallery loses the picture and a hero falls back to plain. Returns the hero link for the renderer.
 */
export function resolvePhotos(content: SiteContent, urls: Map<string, string>): { content: SiteContent; heroImage?: string } {
  let heroImage: string | undefined;
  const fix = (s: Section): Section => {
    if (s.kind === "hero") {
      // A stored upload is swapped for its link, or dropped if it has none. An address that is already usable stays.
      heroImage = s.image ? (isPhotoRef(s.image) ? urls.get(s.image) : s.image) : undefined;
      return heroImage ? s : { ...s, variant: "plain" as const };
    }
    if (s.kind === "gallery") {
      return { ...s, images: s.images.flatMap((im) => (isPhotoRef(im.src) ? (urls.get(im.src) ? [{ ...im, src: urls.get(im.src)! }] : []) : [im])) };
    }
    if (s.kind === "about" && s.image) {
      // The same rule as the gallery: a stored upload becomes its link, or the picture is left out.
      const src = isPhotoRef(s.image.src) ? urls.get(s.image.src) : s.image.src;
      const { image, ...rest } = s;
      return src ? { ...rest, image: { ...image, src } } : rest;
    }
    return s;
  };
  const sections = content.sections.map(fix);
  const pages = content.pages?.map((p) => ({ ...p, sections: p.sections.map(fix) }));
  // A logo that has no link is left out: the header then shows the business name as text.
  const { logo, ...business } = content.business;
  const logoUrl = logo && isPhotoRef(logo) ? urls.get(logo) : undefined;
  return { content: { ...content, business: { ...business, ...(logoUrl ? { logo: logoUrl } : {}) }, sections, ...(pages ? { pages } : {}) }, heroImage };
}
