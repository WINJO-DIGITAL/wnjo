import { type NextRequest } from "next/server";
import { originOf } from "@/lib/site-template/hosts";
import { liveSiteForRequest } from "@/lib/site-template/live-request";
import { sitemapXml } from "@/lib/site-template/seo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The sitemap of a customer's live website, at its own address. */
export async function GET(request: NextRequest, ctx: { params: Promise<{ host: string }> }) {
  const found = await liveSiteForRequest(request.headers, (await ctx.params).host);
  if (!found) return new Response(null, { status: 404 });
  const body = sitemapXml(originOf(request.headers, found.host), found.site.content, found.site.releasedAt ?? undefined);
  return new Response(body, { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, s-maxage=300, stale-while-revalidate=300" } });
}
