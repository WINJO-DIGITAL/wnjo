import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteRender } from "@/components/site-template/SiteRender";
import { serviceClient } from "@/lib/quote-store";
import type { SiteContent } from "@/lib/site-template/schema";

export const dynamic = "force-dynamic";
// A private preview: kept out of search, and never sends the address on to other sites.
export const metadata: Metadata = { title: "Website preview", robots: { index: false, follow: false }, referrer: "no-referrer" };

const TOKEN = /^[A-Za-z0-9_-]{20,64}$/;

/**
 * A private preview of a template website, laid out by our own renderer from checked content. Reached only through
 * its long random address, which staff keep until a person releases the build to the customer. A withdrawn build
 * shows nothing. The booking form is inactive here: a preview must never send anything.
 */
export default async function SitePreviewPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!TOKEN.test(token)) notFound();
  const db = serviceClient();
  if (!db) notFound();
  const { data } = await db.from("website_site_builds").select("status, checks_ok, content").eq("access_token", token).maybeSingle();
  const row = data as { status: "draft" | "released" | "withdrawn"; checks_ok: boolean; content: SiteContent } | null;
  if (!row || row.status === "withdrawn" || !Array.isArray(row.content?.sections)) notFound();

  return (
    <div className="sitepv">
      <p className="sitepv__banner">
        {row.status === "draft" ? "Draft preview. Not shared with the customer yet." : "Private preview of your website."}
        {!row.checks_ok && " Some automatic checks failed, so look closely."}
      </p>
      <SiteRender content={row.content} />
    </div>
  );
}
