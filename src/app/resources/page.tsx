import Link from "next/link";
import { PageHero } from "@/components/Blocks";
import { pageMetadata } from "@/lib/metadata";
import { articles } from "@/lib/articles";

export const metadata = pageMetadata("/resources", "Resources", "Practical guides for small businesses getting a website with WNJO.");

const day = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" });

export default function ResourcesPage() {
  return (
    <>
      <PageHero eyebrow="Resources" title={<>Plain answers, <span className="serif-em">no jargon.</span></>} lede="Practical guides for getting a website for your business." />
      <section className="section--tight" style={{ paddingTop: 0 }}>
        <div className="container container--wide">
          <ul role="list" className="article-list">
            {articles.map((a) => (
              <li key={a.slug} className="article-card">
                <p className="article-card__date">{day.format(new Date(a.published))}</p>
                <h2 className="h3">
                  <Link href={`/resources/${a.slug}`}>{a.title}</Link>
                </h2>
                <p className="muted">{a.description}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
