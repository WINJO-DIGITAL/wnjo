import type { MetadataRoute } from "next";
import { publicRoutes } from "@/lib/routes";
import { siteUrl } from "@/lib/site";
import { articles } from "@/lib/articles";

// Absolute URLs need a confirmed domain; until NEXT_PUBLIC_SITE_URL is set the sitemap is empty.
export default function sitemap(): MetadataRoute.Sitemap {
  const url = siteUrl();
  if (!url) return [];
  const pages = publicRoutes.map((path) => ({ url: `${url}${path === "/" ? "" : path}` }));
  const posts = articles.map((a) => ({ url: `${url}/resources/${a.slug}`, lastModified: a.published }));
  return [...pages, ...posts];
}
