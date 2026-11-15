import sharp from "sharp";
import { type NextRequest } from "next/server";
import { BRIEF_BUCKET } from "@/lib/brief-store";
import { MAX_PHOTO_WIDTH, MIN_PHOTO_WIDTH, publicSiteClient } from "@/lib/site-template/live";
import { liveSiteForRequest } from "@/lib/site-template/live-request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RASTER = new Set(["image/jpeg", "image/png", "image/webp"]);
const missing = () => new Response(null, { status: 404 });
// A picture's address names one stored file and never changes its content, so browsers and the CDN may keep it for good.
const FOREVER = "public, max-age=31536000, immutable";

/**
 * A photo on a customer's live website, resized to the width asked for (never larger than the original or 1800 px) and
 * sent as WebP. Only the website's own uploads are served: a file that isn't in this website's brief is a 404, so the
 * route can't be used to read anyone else's files. A logo that is a vector file is sent as it is, sandboxed.
 */
export async function GET(request: NextRequest, ctx: { params: Promise<{ host: string }> }) {
  const found = await liveSiteForRequest(request.headers, (await ctx.params).host);
  if (!found) return missing();
  const params = new URL(request.url).searchParams;
  const file = found.site.files.find((f) => f.path === params.get("f"));
  if (!file || (!RASTER.has(file.type) && file.type !== "image/svg+xml")) return missing();

  const db = publicSiteClient();
  const { data, error } = db ? await db.storage.from(BRIEF_BUCKET).download(file.path) : { data: null, error: true };
  if (error || !data) return missing();
  const original = Buffer.from(await data.arrayBuffer());

  if (file.type === "image/svg+xml") {
    return new Response(new Uint8Array(original), {
      headers: { "content-type": "image/svg+xml", "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox", "x-content-type-options": "nosniff", "cache-control": FOREVER },
    });
  }
  const asked = Number(params.get("w"));
  const width = Math.min(MAX_PHOTO_WIDTH, Math.max(MIN_PHOTO_WIDTH, Number.isFinite(asked) && asked > 0 ? Math.round(asked) : 1200));
  try {
    const resized = await sharp(original, { limitInputPixels: 60_000_000, failOn: "none" }).rotate().resize({ width, withoutEnlargement: true }).webp({ quality: 78 }).toBuffer();
    return new Response(new Uint8Array(resized), { headers: { "content-type": "image/webp", "x-content-type-options": "nosniff", "cache-control": FOREVER } });
  } catch {
    return missing();
  }
}
