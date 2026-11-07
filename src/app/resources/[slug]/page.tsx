import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHero } from "@/components/Blocks";
import { pageMetadata } from "@/lib/metadata";
import { articleBySlug, articles } from "@/lib/articles";
import { site, siteUrl } from "@/lib/site";

export function generateStaticParams() {
  return articles.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = articleBySlug(slug);
  if (!article) return {};
  return pageMetadata(`/resources/${article.slug}`, article.title, article.description);
}

const day = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" });

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = articleBySlug(slug);
  if (!article) notFound();
  const base = (siteUrl() ?? "https://www.wnjoweb.co.uk").replace(/\/+$/, "");
  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.description,
    datePublished: article.published,
    author: { "@type": "Organization", name: site.name, url: base },
    publisher: { "@id": `${base}/#business` },
    mainEntityOfPage: `${base}/resources/${article.slug}`,
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <PageHero eyebrow={day.format(new Date(article.published))} title={article.title} lede={article.description} />
      <section className="section--tight" style={{ paddingTop: 0 }}>
        <div className="container container--wide">
          <article className="prose">
            {article.sections.map((s) => (
              <section key={s.heading}>
                <h2>{s.heading}</h2>
                {s.paragraphs.map((p) => (
                  <p key={p}>{p}</p>
                ))}
              </section>
            ))}
            <p>
              <Link href="/pricing">See all prices</Link> or <Link href="/build">get your price</Link>.
            </p>
          </article>
        </div>
      </section>
    </>
  );
}
