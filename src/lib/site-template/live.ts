/**
 * A customer's live website, found from the address it is served on. A site is live only when all three hold: its
 * address was attached by staff, its brief is at the "live" stage (which the database only allows once all four
 * approvals are in), and it has a released build. Nothing else is ever served on a customer's address.
 *
 * This file uses no server-only imports, so the public site page can load it. It takes the database client as an
 * argument, so the tests can use a fake.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { BriefFile } from "@/lib/website-brief";
import { isPhotoRef, photoPath, photoRefs } from "./photos";
import type { SiteContent } from "./schema";

export type LiveSite = {
  buildId: string;
  briefId: string;
  tenantId: string;
  content: SiteContent;
  /** The customer's uploads: the only files the live site may show. */
  files: Pick<BriefFile, "path" | "type">[];
  releasedAt: string | null;
};

/** The database client for the public site: the server's own key, never the browser's. Null when it isn't set. */
export function publicSiteClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return url && key ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
}

export async function loadLiveSite(db: SupabaseClient, host: string): Promise<LiveSite | null> {
  const { data: domain } = await db.from("site_domains").select("brief_id, tenant_id").eq("hostname", host).maybeSingle();
  const d = domain as { brief_id: string; tenant_id: string } | null;
  if (!d) return null;

  const { data: briefRow } = await db.from("website_briefs").select("stage, brief").eq("id", d.brief_id).eq("tenant_id", d.tenant_id).maybeSingle();
  const brief = briefRow as { stage: string; brief: { files?: unknown } | null } | null;
  if (!brief || brief.stage !== "live") return null;

  const { data: build } = await db
    .from("website_site_builds")
    .select("id, content, released_at")
    .eq("brief_id", d.brief_id)
    .eq("tenant_id", d.tenant_id)
    .eq("status", "released")
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  const b = build as { id: string; content: SiteContent; released_at: string | null } | null;
  if (!b || !Array.isArray(b.content?.sections)) return null;

  const files = (Array.isArray(brief.brief?.files) ? brief.brief.files : []).flatMap((f) => {
    const r = f as { path?: unknown; type?: unknown };
    return typeof r.path === "string" && typeof r.type === "string" ? [{ path: r.path, type: r.type }] : [];
  });
  return { buildId: b.id, briefId: d.brief_id, tenantId: d.tenant_id, content: b.content, files, releasedAt: b.released_at };
}

/** The widest a picture is ever shown, by where it is used, so a phone never downloads a 20 MB original. */
export const PHOTO_WIDTHS = { hero: 1600, gallery: 900, logo: 800 } as const;
export const MAX_PHOTO_WIDTH = 1800;
export const MIN_PHOTO_WIDTH = 200;

/** The address of a stored photo on the live site: our own picture route, sized for where it is used. */
export const livePhotoUrl = (path: string, width: number): string => `/photo?f=${encodeURIComponent(path)}&w=${width}`;

/**
 * Links for the photos a build refers to, but only for files that belong to this website's own brief. Any other
 * reference gets no link, so the site simply goes without that picture.
 */
export function livePhotoUrls(content: SiteContent, files: Pick<BriefFile, "path">[]): Map<string, string> {
  const own = new Set(files.map((f) => f.path));
  const heroes = new Set(content.sections.flatMap((s) => (s.kind === "hero" && s.image ? [s.image] : [])));
  const urls = new Map<string, string>();
  for (const ref of photoRefs(content)) {
    if (!isPhotoRef(ref) || !own.has(photoPath(ref))) continue;
    const width = heroes.has(ref) ? PHOTO_WIDTHS.hero : ref === content.business.logo ? PHOTO_WIDTHS.logo : PHOTO_WIDTHS.gallery;
    urls.set(ref, livePhotoUrl(photoPath(ref), width));
  }
  return urls;
}
