import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CtaBand } from "@/components/Blocks";
import { ArrowRight } from "@/components/Icons";
import { HeroShowcase } from "@/components/interactive/HeroShowcase";
import { OwnerQuotes } from "@/components/interactive/OwnerQuotes";
import { RefreshTimeline } from "@/components/managed/RefreshTimeline";
import { Responsibility } from "@/components/managed/Responsibility";
import { SearchServices, SubscriptionTerms } from "@/components/managed/Sections";
import { PackageCards } from "@/components/pricing/WebsitePackages";
import { WebStages } from "@/components/WebStages";
import { REFRESH, WEBSITE_PLANS, formatGBP } from "@/lib/pricing";
import { heroProjects, OWNER_QUOTES, projectBySlug } from "@/lib/projects";
import { siteUrl } from "@/lib/site";
import { businessSchema } from "@/lib/structured-data";

// Title, description and share image come from the root layout; only the canonical URL is added here.
export const metadata: Metadata = siteUrl()
  ? { alternates: { canonical: "/" } }
  : {};

const fystay = projectBySlug("fystay")!;
/** The three client projects, then our own platform. */
const work = [...heroProjects, fystay];

export default function HomePage() {
  const schema = businessSchema(siteUrl() ?? "https://winjodigital.co.uk");
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      {/* Hero: the promise, the price it starts at, and real work straight beneath. */}
      <section
        className="hero-ed hero-ed--work"
        data-nav="/"
        aria-labelledby="hero-title"
        data-cta-hide
      >
        <div className="container container--wide hero-ed__layout">
          <div className="hero-ed__copy">
            <h1
              id="hero-title"
              className="hero-ed__title rise"
              style={{ "--i": 1 } as React.CSSProperties}
            >
              <span className="hero-ed__line">Your website.</span>{" "}
              <span className="serif-em">Our responsibility.</span>
            </h1>
            <div
              className="btn-row rise"
              style={{ "--i": 4 } as React.CSSProperties}
            >
              <Link href="/build?plan=bronze" className="btn btn--primary">
                Get started
              </Link>
              <Link href="/pricing" className="hero-ed__textlink">
                See plans and pricing
              </Link>
            </div>
          </div>
        </div>
        <div
          aria-label="Websites we designed and look after"
          className="container container--wide showcase-section"
        >
          <HeroShowcase items={heroProjects} />
        </div>
      </section>

      {/* What changes: the list of website jobs moves from the owner to us. */}
      <section id="managed" className="tile home-tile" data-nav="/managed-websites" aria-labelledby="managed-title">
        <div className="container container--wide tile__head" data-reveal>
          <p className="tile__name">Managed websites</p>
          <h2 id="managed-title" className="tile__title">
            One less thing <span className="serif-em">to worry about.</span>
          </h2>
          <div className="tile__aside">
            <p className="tile__line">
              One predictable monthly payment. One team looking after it.
            </p>
            <p className="tile__more">
              <Link href="/managed-websites" className="arrow-link">
                How managed websites work <ArrowRight />
              </Link>
            </p>
          </div>
        </div>
        <div className="container container--wide tile__visual" data-reveal>
          <Responsibility />
        </div>
      </section>

      {/* The three subscriptions. */}
      <section id="packages" className="tile home-tile" data-nav="/pricing" aria-labelledby="packages-title">
        <div className="container container--wide tile__head" data-reveal>
          <p className="tile__name">Plans</p>
          <h2 id="packages-title" className="tile__title">
            Three plans. <span className="serif-em">No minimum term.</span>
          </h2>
          <div className="tile__aside">
            <p className="tile__line">
              Rolling monthly, with no large upfront cost. We grow as you grow.
            </p>
            <p className="tile__more">
              <Link href="/pricing#compare" className="arrow-link">
                Compare the plans <ArrowRight />
              </Link>
            </p>
          </div>
        </div>
        <div className="container container--wide tile__visual" data-reveal>
          <PackageCards compact />
        </div>
      </section>

      {/* Winjo Refresh: the same website at launch and after each planned refresh. */}
      <section id="refresh" className="tile inverse home-tile" data-nav="/winjo-refresh" aria-labelledby="refresh-title">
        <div className="container container--wide tile__head" data-reveal>
          <p className="tile__name">Winjo Refresh</p>
          <h2 id="refresh-title" className="tile__title">
            A new design <span className="serif-em">every {REFRESH.everyMonths} months.</span>
          </h2>
          <div className="tile__aside">
            <p className="tile__line">
              Your website shouldn&apos;t become outdated, and keeping it current shouldn&apos;t be another expense to
              organise. Included in {WEBSITE_PLANS.silver.name} and {WEBSITE_PLANS.gold.name}.
            </p>
            <p className="tile__more">
              <Link href="/winjo-refresh" className="arrow-link">
                How Winjo Refresh works <ArrowRight />
              </Link>
            </p>
          </div>
        </div>
        <div className="container container--wide tile__visual" data-reveal>
          <RefreshTimeline />
        </div>
      </section>

      {/* Work: real websites we designed, as evidence. Swipes on phones. */}
      <section id="work" className="tile home-tile" data-nav="/work" aria-labelledby="work-title">
        <div className="container container--wide tile__head" data-reveal>
          <p className="tile__name">Our work</p>
          <h2 id="work-title" className="tile__title">
            Bespoke, every time.
          </h2>
          <div className="tile__aside">
            <p className="tile__line">No templates. Each of these was designed around the business it serves.</p>
            <p className="tile__more">
              <Link href="/work" className="arrow-link">
                See all our work <ArrowRight />
              </Link>
            </p>
          </div>
        </div>
        <div className="container container--wide" data-reveal>
          <ul className="home-work" role="list">
            {work.map((p) => (
              <li key={p.slug}>
                <Link href={`/work#${p.slug}`} className="home-work__link">
                  <Image
                    src={p.desktop}
                    alt={`The ${p.name} website`}
                    sizes="(min-width: 64rem) 300px, 80vw"
                    placeholder="blur"
                    className="home-work__shot"
                  />
                  <span className="home-work__head">
                    <Image src={p.logo} alt="" width={28} height={28} sizes="28px" className="home-work__logo" />
                    <span className="home-work__name">{p.name}</span>
                  </span>
                  <span className="home-work__problem">{p.sector}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Search and AI, benefit first. */}
      <section id="search" className="tile home-tile" data-nav="/managed-websites" aria-labelledby="search-title">
        <div className="container container--wide tile__head" data-reveal>
          <p className="tile__name">Being found</p>
          <h2 id="search-title" className="tile__title">
            Built to be found, <span className="serif-em">by people and by AI.</span>
          </h2>
          <div className="tile__aside">
            <p className="tile__line">
              Search is changing. {WEBSITE_PLANS.silver.name} and {WEBSITE_PLANS.gold.name} keep your website ready
              for it.
            </p>
          </div>
        </div>
        <div className="container container--wide" data-reveal>
          <SearchServices />
        </div>
      </section>

      {/* How it works: a real sequence, so it keeps its numbers. */}
      <section id="process" data-nav="/managed-websites" className="tile home-tile" aria-labelledby="process-title">
        <div className="container container--wide tile__head" data-reveal>
          <p className="tile__name">How it works</p>
          <h2 id="process-title" className="tile__title">
            Four steps. Then we keep going.
          </h2>
          <div className="tile__aside">
            <p className="tile__line">Nothing is charged until you agree to go ahead.</p>
          </div>
        </div>
        <div className="container container--wide apps-tile__body">
          <WebStages />
        </div>
      </section>

      {/* The subscription and ownership, plainly. */}
      <section id="ownership" className="tile home-tile" data-nav="/pricing" aria-labelledby="own-title">
        <div className="container container--wide tile__head" data-reveal>
          <p className="tile__name">No lock-in</p>
          <h2 id="own-title" className="tile__title">
            Stay because it works, <span className="serif-em">not because you have to.</span>
          </h2>
          <div className="tile__aside">
            <p className="tile__line">Your domain and your content are always yours.</p>
            <p className="tile__more">
              <Link href="/pricing#how-it-works" className="arrow-link">
                How the subscription works <ArrowRight />
              </Link>
            </p>
          </div>
        </div>
        <div className="container container--wide" data-reveal>
          <SubscriptionTerms />
        </div>
      </section>

      {/* Trust: the owners in their own words. */}
      <section className="owner-quotes" aria-label="From the owners">
        <div className="container container--wide">
          <OwnerQuotes
            items={OWNER_QUOTES.map(({ project, quote, pull }) => ({
              slug: project.slug,
              name: project.name,
              logo: project.logo,
              location: project.location,
              url: project.url,
              host: project.host,
              quote,
              pull,
            }))}
          />
        </div>
      </section>

      <CtaBand
        title={<>Hand us your website.</>}
        body={<>Tell us about your business and what you need. We&apos;ll come back with a plan and a clear monthly price.</>}
      >
        <Link href="/build" className="btn btn--primary">
          Get started
        </Link>
        <Link href="/contact" className="btn btn--secondary">
          Talk to us first
        </Link>
      </CtaBand>
    </>
  );
}
