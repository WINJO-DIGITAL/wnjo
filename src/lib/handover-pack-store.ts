import type { SupabaseClient } from "@supabase/supabase-js";
import type { PageContent } from "@/lib/ai/website-content";
import type { WebsitePlan } from "@/lib/ai/website-plan";
import { BRIEF_BUCKET } from "@/lib/brief-store";
import { packEntries, safeFileName } from "@/lib/handover-pack";
import type { SiteContent } from "@/lib/site-template/schema";
import type { BriefFile } from "@/lib/website-brief";
import { zip } from "@/lib/zip";

/** A private bucket for the finished packs. It allows zip files only (the brief bucket does not). */
export const PACK_BUCKET = "handover-packs";
const MAX_FILES = 40;
const LINK_SECONDS = 600;

export type PackBrief = {
  id: string;
  tenant_id: string;
  reference: string;
  name: string;
  business_name: string | null;
  brief: { files?: BriefFile[] } | null;
  handed_over_at?: string | null;
};

export type PackResult = { ok: true; url: string; files: number } | { ok: false; error: string };

const day = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

/**
 * Builds the website pack for a website, saves it, and returns a short-lived download link. The latest build that
 * hasn't been withdrawn is used. The caller has already checked who is asking: staff for their own tenant, or the
 * signed-in owner of a handed-over website.
 */
export async function createHandoverPack(db: SupabaseClient, brief: PackBrief): Promise<PackResult> {
  const [{ data: build }, { data: preview }, { data: domain }] = await Promise.all([
    db.from("website_site_builds").select("content").eq("brief_id", brief.id).neq("status", "withdrawn").order("version", { ascending: false }).limit(1).maybeSingle(),
    db.from("website_previews").select("pages, website_plans(plan)").eq("brief_id", brief.id).neq("status", "withdrawn").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    db.from("site_domains").select("hostname").eq("brief_id", brief.id).limit(1).maybeSingle(),
  ]);
  const site = (build as { content: SiteContent } | null)?.content ?? null;
  const prev = preview as unknown as { pages: PageContent[]; website_plans: { plan: WebsitePlan } | null } | null;
  if (!site && !prev?.pages?.length) return { ok: false, error: "There is no finished website to put in a pack yet." };

  const files: { name: string; data: Uint8Array }[] = [];
  for (const f of (brief.brief?.files ?? []).slice(0, MAX_FILES)) {
    const { data, error } = await db.storage.from(BRIEF_BUCKET).download(f.path);
    if (error || !data) return { ok: false, error: `The file "${f.name}" couldn't be read. Try again.` };
    files.push({ name: f.name, data: new Uint8Array(await data.arrayBuffer()) });
  }

  const businessName = brief.business_name || brief.name;
  const titles = new Map((prev?.website_plans?.plan.pages ?? []).map((p) => [p.slug, p.title]));
  const archive = zip(
    packEntries({
      reference: brief.reference,
      businessName,
      address: (domain as { hostname: string } | null)?.hostname ?? null,
      site,
      previewPages: site ? null : prev?.pages,
      previewTitles: titles,
      files,
      handedOver: brief.handed_over_at ? day(brief.handed_over_at) : null,
    }),
  );

  const path = `${brief.tenant_id}/${brief.id}/website-pack.zip`;
  const { error: uploadError } = await db.storage.from(PACK_BUCKET).upload(path, archive, { contentType: "application/zip", upsert: true });
  if (uploadError) {
    console.error(`Website pack not saved: ${uploadError.message}`);
    return { ok: false, error: "The pack couldn't be saved. Check that the pack storage has been set up." };
  }
  const { data: signed, error: signError } = await db.storage.from(PACK_BUCKET).createSignedUrl(path, LINK_SECONDS, { download: `${safeFileName(businessName)}-website-pack.zip` });
  if (signError || !signed) return { ok: false, error: "The pack couldn't be opened. Try again." };
  return { ok: true, url: signed.signedUrl, files: files.length };
}
