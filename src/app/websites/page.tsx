import Link from "next/link";
import { CtaBand, PageHero, SectionHead } from "@/components/Blocks";
import { BrowserFrame } from "@/components/Devices";
import { WebsitesTile } from "@/components/WebsitesTile";
import { projects } from "@/lib/projects";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata(
  "/websites",
  "Bespoke web design and development",
  "Bespoke web design and development for businesses: websites built to bring in enquiries and bookings, with clear starting prices, a monthly subscription option, and hosting and care.",
);

export default function WebsitesPage() {
  return (
    <>
      <PageHero
        eyebrow="Grow · Websites"
        title={
          <>
            Bespoke websites, priced in the open.
          </>
        }
        lede="Websites that reflect the quality of your business, with the price on the page."
      >
        <div className="btn-row">
          <Link href="/build" className="btn btn--primary">
            Build my website
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
                Three clients, three identities.
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
            See what your website would cost.
          </>
        }
        body="Nine quick steps to an instant estimate you can send us."
      >
        <Link href="/build" className="btn btn--primary">
          Build my website
        </Link>
        <Link href="/contact?topic=website" className="btn btn--secondary">
          Talk to us
        </Link>
      </CtaBand>
    </>
  );
}
