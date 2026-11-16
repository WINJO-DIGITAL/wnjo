import type { Metadata } from "next";
import { site, siteUrl } from "./site";

/**
 * The share image from app/opengraph-image.png. Page metadata is merged shallowly,
 * so a page that sets its own openGraph must list the image again or lose it.
 */
const shareImage = { url: "/opengraph-image.png", width: 1200, height: 630, alt: `${site.name} logo` };

/**
 * The homepage keeps the title and description from the root layout and adds its canonical URL and og:url, like every
 * other page. Both are emitted only once the production domain is configured.
 */
export function homeMetadata(): Metadata {
  if (!siteUrl()) return {};
  const title = `${site.name} | Fully managed business websites`;
  return {
    alternates: { canonical: "/" },
    openGraph: { type: "website", siteName: site.name, locale: site.locale, title, description: site.description, images: [shareImage], url: "/" },
  };
}

/** Per-page metadata. Canonical URLs are emitted only once the production domain is configured. */
export function pageMetadata(path: string, title: string, description: string): Metadata {
  const hasDomain = Boolean(siteUrl());
  return {
    title,
    description,
    ...(hasDomain && { alternates: { canonical: path } }),
    openGraph: {
      type: "website",
      siteName: site.name,
      locale: site.locale,
      title: `${title} | ${site.name}`,
      description,
      images: [shareImage],
      ...(hasDomain && { url: path }),
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ${site.name}`,
      description,
      images: [shareImage],
    },
  };
}
