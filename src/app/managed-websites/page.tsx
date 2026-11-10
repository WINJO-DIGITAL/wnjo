import Link from "next/link";
import { CtaBand, PageHero, SectionHead } from "@/components/Blocks";
import { BrowserFrame } from "@/components/Devices";
import { ArrowRight } from "@/components/Icons";
import { SiteStyler } from "@/components/interactive/SiteStyler";
import { CareBoard } from "@/components/managed/CareBoard";
import { Responsibility } from "@/components/managed/Responsibility";
import { RefreshCompare, SearchServices, SubscriptionTerms } from "@/components/managed/Sections";
import { WebStages } from "@/components/WebStages";
import { archivo, jost } from "@/lib/fonts";
import { pageMetadata } from "@/lib/metadata";
import { REFRESH, WEBSITE_PLANS, formatGBP } from "@/lib/pricing";
import { projects } from "@/lib/projects";

export const metadata = pageMetadata(
  "/managed-websites",
  "Managed websites",
  `A bespoke website that we design, host, maintain, update and keep improving for one monthly payment, from ${formatGBP(WEBSITE_PLANS.bronze.monthly)} a month. No minimum term.`,
);

// What the subscription covers every month, from the plans' own inclusions.
const monthly: [string, string][] = [
  ["Bespoke design", "Designed for your business, never a template."],
  ["Managed hosting", "Hosting and your SSL certificate, arranged and renewed for you."],
  ["Security", "Monitored, and fixed when something needs attention."],
  ["Maintenance and updates", "The technical upkeep, done without you asking."],
  ["Monitoring and fixes", "We watch for downtime and resolve faults."],
  ["Support and changes", "One team to ask when something needs changing."],
];

export default function ManagedWebsitesPage() {
  return (
    <>
      <PageHero
        eyebrow="Managed websites"
        title={<>Built for your business. Looked after by ours.</>}
        lede="From bespoke design and hosting to maintenance, updates and ongoing improvements, Winjo takes care of everything behind your online presence."
      >
        <div className="btn-row">
          <Link href="/build" className="btn btn--primary">
            Get started
          </Link>
          <Link href="/pricing" className="btn btn--secondary">
            See plans and pricing
          </Link>
        </div>
      </PageHero>

      {/* The difference, in one switch. */}
      <section className="section--tight" style={{ paddingTop: 0 }} aria-label="Who looks after your website">
        <div className="container container--wide" data-reveal>
          <Responsibility />
        </div>
      </section>

      {/* What you get every month. */}
      <section id="included" className="section section--ruled" aria-labelledby="included-title">
        <div className="container container--wide">
          <SectionHead eyebrow="Every month" title={<span id="included-title">Everything behind your website, handled.</span>} split>
            <p>You&apos;re not just paying for a website. You&apos;re paying to have one less thing to worry about.</p>
          </SectionHead>
          <div className="managed-split">
            <div data-reveal>
              <CareBoard />
            </div>
            <ul role="list" className="managed-list" data-reveal>
              {monthly.map(([title, line]) => (
                <li key={title}>
                  <h3>{title}</h3>
                  <p>{line}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Bespoke design, shown: one site restyled for four kinds of business. */}
      <section id="design" className={`section section--ruled ${jost.variable} ${archivo.variable}`} aria-labelledby="design-title">
        <div className="container container--wide">
          <SectionHead eyebrow="Bespoke design" title={<span id="design-title">Designed around your business.</span>} split>
            <p>Pick a business and watch the website change. Yours is designed the same way: for you.</p>
          </SectionHead>
          <div data-reveal>
            <SiteStyler />
          </div>
        </div>
      </section>

      {/* Winjo Refresh. */}
      <section id="refresh" className="section inverse" aria-labelledby="refresh-title">
        <div className="container container--wide">
          <SectionHead
            eyebrow="Winjo Refresh"
            title={<span id="refresh-title">Refreshed every {REFRESH.everyMonths} months, without the bill for a new redesign.</span>}
            split
          >
            <p>
              Included in {WEBSITE_PLANS.silver.name} and {WEBSITE_PLANS.gold.name}.
            </p>
            <p className="mt-4">
              <Link href="/winjo-refresh" className="arrow-link">
                How Winjo Refresh works <ArrowRight />
              </Link>
            </p>
          </SectionHead>
          <div data-reveal>
            <RefreshCompare />
          </div>
        </div>
      </section>

      {/* Search and AI. */}
      <section id="search" className="section" aria-labelledby="search-title">
        <div className="container container--wide">
          <SectionHead eyebrow="Being found" title={<span id="search-title">Ready for how people search now.</span>} split>
            <p>Search engines, answer engines and AI tools all need to understand your website. We build for all three.</p>
          </SectionHead>
          <div data-reveal>
            <SearchServices />
          </div>
        </div>
      </section>

      {/* How getting started works. */}
      <section id="process" className="section section--ruled" aria-labelledby="process-title">
        <div className="container container--wide">
          <SectionHead eyebrow="Getting started" title={<span id="process-title">Four steps. Then we keep going.</span>} split>
            <p>Nothing is charged until you agree to go ahead.</p>
          </SectionHead>
          <WebStages />
        </div>
      </section>

      {/* The subscription and ownership. */}
      <section id="subscription" className="section section--ruled" aria-labelledby="subscription-title">
        <div className="container container--wide">
          <SectionHead eyebrow="Your subscription" title={<span id="subscription-title">Rolling monthly. No lock-in.</span>} split>
            <p>Your domain and your content are always yours.</p>
          </SectionHead>
          <div data-reveal>
            <SubscriptionTerms />
          </div>
        </div>
      </section>

      {/* Evidence. */}
      <section className="section section--ruled" aria-labelledby="examples-title">
        <div className="container container--wide">
          <SectionHead eyebrow="Our work" title={<span id="examples-title">Three clients, three identities.</span>} split>
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
        title={<>You run your business. We&apos;ll run your website.</>}
        body={`Plans from ${formatGBP(WEBSITE_PLANS.bronze.monthly)} a month, with no minimum term.`}
      >
        <Link href="/build" className="btn btn--primary">
          Get started
        </Link>
        <Link href="/pricing" className="btn btn--secondary">
          See plans and pricing
        </Link>
      </CtaBand>
    </>
  );
}
