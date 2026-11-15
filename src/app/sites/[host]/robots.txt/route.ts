import { type NextRequest } from "next/server";
import { originOf } from "@/lib/site-template/hosts";
import { liveSiteForRequest } from "@/lib/site-template/live-request";
import { robotsTxt } from "@/lib/site-template/seo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The robots file of a customer's live website. A site that isn't live has none: it is a 404. */
export async function GET(request: NextRequest, ctx: { params: Promise<{ host: string }> }) {
  const found = await liveSiteForRequest(request.headers, (await ctx.params).host);
  if (!found) return new Response(null, { status: 404 });
  return new Response(robotsTxt(originOf(request.headers, found.host)), { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, s-maxage=300, stale-while-revalidate=300" } });
}
