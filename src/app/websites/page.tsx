import Link from "next/link";
import { CtaBand, PageHero, SectionHead } from "@/components/Blocks";
import { BrowserFrame } from "@/components/Devices";
import { Stopwatch } from "@/components/Icons";
import { WebsitesTile } from "@/components/WebsitesTile";
import { projects } from "@/lib/projects";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata(
  "/websites",
  "Bespoke websites",
  "Bespoke website design and development with clear packages, transparent starting prices and optional hosting and care plans.",
);

export default function WebsitesPage() {
  return (
    <>
      <PageHero
        eyebrow="Websites"
        title={
          <>
            Bespoke websites, <span className="serif-em">priced in the open.</span>
          </>
        }
        lede="Websites that reflect the quality of your business, with the price on the page."
      >
        <div className="btn-row">
          <Link href="/build" className="btn btn--primary">
            <Stopwatch />
            Get my price
          </Link>
          <Link href="/pricing" className="btn btn--secondary">
            See all prices
          </Link>
        </div>
      </PageHero>

      <WebsitesTile />

      <section className="section section--ruled" aria-labelledby="examples-title">
        <div className="container container--wide">
          <SectionHead
            eyebrow="Recent websites"
            title={
              <span id="examples-title">
                Three clients, <span className="serif-em">three identities.</span>
              </span>
            }
            split
          >
            <p>The same standards underneath, a different face on top.</p>
          </SectionHead>
          <div className="site-strip">
            {projects
              .filter((p) => p.kind === "client")
              .map((p) => (
                <Link key={p.slug} href={`/work#${p.slug}`}>
                  <div>
                    <BrowserFrame
                      src={p.desktop}
                      host={p.host}
                      alt={`The ${p.name} website`}
                      sizes="(min-width: 48rem) 420px, 90vw"
                    />
                  </div>
                  <p>
                    <strong>{p.name}</strong>
                    <span>{p.sector}</span>
                  </p>
                </Link>
              ))}
          </div>
        </div>
      </section>

      <CtaBand
        title={
          <>
            See what your website <span className="serif-em">would cost.</span>
          </>
        }
        body="Nine quick steps to an instant estimate you can send us."
      >
        <Link href="/build" className="btn btn--primary">
          <Stopwatch />
          Get my price
        </Link>
        <Link href="/contact?topic=website" className="btn btn--secondary">
          Talk to us
        </Link>
      </CtaBand>
    </>
  );
}
