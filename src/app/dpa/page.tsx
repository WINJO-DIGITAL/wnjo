import { PageHero } from "@/components/Blocks";
import { pageMetadata } from "@/lib/metadata";
import { readLegal, renderLegal } from "@/lib/legal-markdown";

export const metadata = pageMetadata(
  "/dpa",
  "Data processing agreement",
  "How WINJO DIGITAL processes personal data on behalf of customers who run a website with us.",
);

/* The full text lives in content/legal/dpa.md. */
export default function DpaPage() {
  return (
    <>
      <PageHero eyebrow="Legal" title="Data processing agreement." lede="How we handle personal data for your website." />
      <section className="section--tight" style={{ paddingTop: 0 }}>
        <div className="container container--wide">
          <div className="prose">{renderLegal(readLegal("dpa"))}</div>
        </div>
      </section>
    </>
  );
}
