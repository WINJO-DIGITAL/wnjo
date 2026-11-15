import type { GetServerSideProps } from "next";
import Head from "next/head";
import { SiteRender } from "@/components/site-template/SiteRender";
import { extraMainHosts, hostOf, isMainHost, originOf } from "@/lib/site-template/hosts";
import { livePhotoUrl, livePhotoUrls } from "@/lib/site-template/live";
import { liveSiteFor } from "@/lib/site-template/live-source";
import { isPhotoRef, photoPath, resolvePhotos } from "@/lib/site-template/photos";
import type { SiteContent } from "@/lib/site-template/schema";
import { jsonLdText, localBusinessJsonLd, pageDescription, pagesOf, pageTitle } from "@/lib/site-template/seo";

type Props = {
  content: SiteContent;
  heroImage: string | null;
  slug: string;
  sent: "sent" | "error" | null;
  title: string;
  description: string;
  canonical: string;
  ogImage: string | null;
  icon: string;
  jsonLd: string;
};

/**
 * A customer's live website, on their own address. The proxy sends every request to an address that isn't ours here.
 * It is served only for the address it was reached on (so /sites/<address> typed on our own address is a 404), and
 * only when the site is live. This page has no WINJO DIGITAL header, footer or styles.
 */
export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const wanted = typeof ctx.params?.host === "string" ? ctx.params.host : "";
  const host = hostOf(ctx.req.headers.host);
  if (!wanted || wanted !== host || isMainHost(host, extraMainHosts(process.env.MAIN_HOSTS))) return { notFound: true };

  const segments = ctx.params?.page;
  const parts = Array.isArray(segments) ? segments : [];
  if (parts.length > 1) return { notFound: true };
  const slug = parts[0] ?? "";

  const site = await liveSiteFor(host);
  if (!site || !pagesOf(site.content).some((p) => p.slug === slug)) return { notFound: true };

  const urls = livePhotoUrls(site.content, site.files);
  const { content, heroImage } = resolvePhotos(site.content, urls);
  const origin = originOf({ get: (name) => (typeof ctx.req.headers[name] === "string" ? (ctx.req.headers[name] as string) : null) }, host);

  // A link preview wants a smaller picture than the top of the page does.
  const heroRef = site.content.sections.find((s) => s.kind === "hero")?.kind === "hero" ? (site.content.sections.find((s) => s.kind === "hero") as { image?: string }).image : undefined;
  const ogImage = heroRef && isPhotoRef(heroRef) && heroImage ? `${origin}${livePhotoUrl(photoPath(heroRef), 1200)}` : heroImage?.startsWith("/") ? `${origin}${heroImage}` : null;

  ctx.res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=60");
  const sent = ctx.query.sent === "1" ? "sent" : ctx.query.sent === "0" ? "error" : null;

  return {
    props: JSON.parse(
      JSON.stringify({
        content,
        heroImage: heroImage ?? null,
        slug,
        sent,
        title: pageTitle(content, slug),
        description: pageDescription(content, slug),
        canonical: `${origin}/${slug}`,
        ogImage,
        // The customer's logo is the tab icon. Without one the icon is empty, so the browser doesn't ask for a file that isn't there.
        icon: site.content.business.logo && urls.has(site.content.business.logo) ? livePhotoUrl(photoPath(site.content.business.logo), 64) : "data:,",
        jsonLd: jsonLdText(localBusinessJsonLd(content, `${origin}/`, ogImage ?? undefined)),
      } satisfies Props),
    ) as Props,
  };
};

export default function LiveSitePage({ content, heroImage, slug, sent, title, description, canonical, ogImage, icon, jsonLd }: Props) {
  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={canonical} />
        <link rel="icon" href={icon} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={canonical} />
        <meta property="og:site_name" content={content.business.name} />
        {ogImage && <meta property="og:image" content={ogImage} />}
        <meta name="twitter:card" content={ogImage ? "summary_large_image" : "summary"} />
        <script key="ld" type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      </Head>
      <SiteRender
        content={content}
        heroImage={heroImage ?? undefined}
        page={slug}
        pageHref={(s) => (s ? `/${s}` : "/")}
        enquiry={{ action: "/api/site-enquiry", state: sent ?? undefined }}
      />
    </>
  );
}
