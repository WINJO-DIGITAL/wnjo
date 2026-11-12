import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { PageContent } from "@/lib/ai/website-content";
import type { WebsitePlan } from "@/lib/ai/website-plan";
import { serviceClient } from "@/lib/quote-store";
import { STYLES, type StyleId } from "@/lib/website-brief";
import { previewExpired } from "@/lib/preview-access";

export const dynamic = "force-dynamic";
// A private preview: kept out of search, and never sends the address on to other sites.
export const metadata: Metadata = { title: "Website preview", robots: { index: false, follow: false }, referrer: "no-referrer" };

const TOKEN = /^[A-Za-z0-9_-]{20,64}$/;

type Row = {
  status: "draft" | "released" | "withdrawn";
  released_at: string | null;
  pages: PageContent[];
  website_plans: { plan: WebsitePlan } | null;
  website_briefs: { business_name: string | null; name: string; brief: { style?: StyleId | null } } | null;
};

/**
 * A private preview of a website, laid out in a fixed design from text only. Reached only through its long random
 * address, which staff keep until a person releases the preview to the customer. A withdrawn preview shows nothing.
 */
export default async function PreviewPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ page?: string }> }) {
  const { token } = await params;
  const { page: pageParam } = await searchParams;
  if (!TOKEN.test(token)) notFound();
  const db = serviceClient();
  if (!db) notFound();
  const { data } = await db
    .from("website_previews")
    .select("status, released_at, pages, website_plans(plan), website_briefs(business_name, name, brief)")
    .eq("access_token", token)
    .maybeSingle();
  const row = data as unknown as Row | null;
  if (!row || row.status === "withdrawn" || !row.pages?.length) notFound();
  if (previewExpired(row.released_at)) notFound();

  const name = row.website_briefs?.business_name || row.website_briefs?.name || "Your website";
  const style = row.website_briefs?.brief?.style ? STYLES[row.website_briefs.brief.style] : null;
  const [paper, ink, accent] = style?.swatch ?? ["#f7f5f0", "#1d1b18", "#8a6f4d"];
  const titles = new Map((row.website_plans?.plan.pages ?? []).map((p) => [p.slug, p.title]));
  const current = row.pages.find((p) => p.slug === pageParam) ?? row.pages[0];
  const font = style?.font === "serif" ? "var(--font-serif, Georgia, serif)" : "var(--font-sans, system-ui, sans-serif)";

  return (
    <div className="pv preview-mark" style={{ "--pv-paper": paper, "--pv-ink": ink, "--pv-accent": accent, "--pv-font": font } as React.CSSProperties}>
      <p className="pv__banner">
        {row.status === "draft" ? "Draft preview. Not shared with the customer yet." : "Private preview of your website."} Words only, in a simple layout. The final design comes later.
      </p>
      <header className="pv__head">
        <p className="pv__brand">{name}</p>
        <nav aria-label="Pages" className="pv__nav">
          {row.pages.map((p) => (
            <Link key={p.slug} href={`/preview/${token}?page=${p.slug}`} aria-current={p.slug === current.slug ? "page" : undefined}>
              {titles.get(p.slug) ?? p.slug}
            </Link>
          ))}
        </nav>
      </header>
      <main className="pv__main">
        <h1 className="pv__headline">{current.headline}</h1>
        {current.intro && <p className="pv__intro">{current.intro}</p>}
        {current.cta && <span className="pv__cta">{current.cta}</span>}
        {current.sections.map((s, i) => (
          <section key={i} className="pv__section">
            {s.heading && <h2>{s.heading}</h2>}
            {s.body && <p>{s.body}</p>}
            {s.bullets.length > 0 && (
              <ul>
                {s.bullets.map((b, j) => (
                  <li key={j}>{b}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </main>
    </div>
  );
}
