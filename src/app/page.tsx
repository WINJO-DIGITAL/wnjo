import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CtaBand } from "@/components/Blocks";
import { ArrowRight } from "@/components/Icons";
import { VisitLogo } from "@/components/VisitLogo";
import { HeroShowcase } from "@/components/interactive/HeroShowcase";
import { OwnerQuotes } from "@/components/interactive/OwnerQuotes";
import { RefreshTimeline } from "@/components/managed/RefreshTimeline";
import { Responsibility } from "@/components/managed/Responsibility";
import { SubscriptionTerms } from "@/components/managed/Sections";
import { BrowserFrame } from "@/components/Devices";
import { PlanChooser } from "@/components/pricing/PlanChooser";
import { TrustCues } from "@/components/TrustCues";
import { WebStages } from "@/components/WebStages";
import { ONE_OFF_WEBSITE, REFRESH, WEBSITE_PLANS, formatGBP } from "@/lib/pricing";
import { homeMetadata } from "@/lib/metadata";
import { heroProjects, OWNER_QUOTES, projectBySlug, projectLine, showsAddress } from "@/lib/projects";
import { siteUrl } from "@/lib/site";
import { businessSchema } from "@/lib/structured-data";

// Title and description come from the root layout; the canonical URL and og:url are added here.
export const metadata: Metadata = homeMetadata();

const fystay = projectBySlug("fystay")!;
const evexec = projectBySlug("ev-exec")!;
/** The four client projects (the hero's), then our own platform. */
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
            <p className="lede rise" style={{ "--i": 2 } as React.CSSProperties}>
              Design, hosting, updates and support in one monthly plan, with no minimum term.
            </p>
            <div
              className="btn-row rise"
              style={{ "--i": 4 } as React.CSSProperties}
            >
              <Link href="/pricing" className="btn btn--primary">
                Get your website from {formatGBP(WEBSITE_PLANS.bronze.monthly)} a month
              </Link>
              <Link href="/work" className="btn btn--secondary">
                See our work
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
              showAddress: project.showAddress,
              quote,
              pull,
            }))}
          />
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
              One predictable monthly payment. One person looking after it.
            </p>
            <p className="tile__more">
              <Link href="/managed-websites" className="arrow-link">
                How managed websites work <ArrowRight />
              </Link>
            </p>
          </div>
        </div>
        <div className="container container--wide tile__visual managed-split" data-reveal>
          <Responsibility />
          {/* Desktop only: one of the sites we look after, beside the list of jobs we take on. */}
          <figure className="managed-split__shot">
            <BrowserFrame
              src={evexec.desktop}
              host={evexec.host}
              name={evexec.name}
              showAddress={evexec.showAddress}
              alt={`The ${evexec.name} website, looked after by WINJO`}
              sizes="(min-width: 64rem) 640px, 0px"
            />
            <figcaption>Looked after by WINJO: {evexec.name}</figcaption>
          </figure>
        </div>
      </section>

      {/* The three subscriptions. */}
      <section id="packages" className="tile home-tile tile--soft" data-nav="/pricing" aria-labelledby="packages-title">
        <div className="container container--wide tile__head" data-reveal>
          <p className="tile__name">Plans</p>
          <h2 id="packages-title" className="tile__title">
            Three plans, <span className="serif-em">no minimum term.</span>
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
          <PlanChooser />
          <TrustCues />
        </div>
      </section>

      {/* WINJO Refresh: the same website at launch and after each planned refresh. */}
      <section id="refresh" className="tile inverse home-tile" data-nav="/winjo-refresh" aria-labelledby="refresh-title">
        <div className="container container--wide tile__head" data-reveal>
          <p className="tile__name">WINJO Refresh</p>
          <h2 id="refresh-title" className="tile__title">
            A design refresh <span className="serif-em">every {REFRESH.everyMonths} months.</span>
          </h2>
          <div className="tile__aside">
            <p className="tile__line">
              Your website shouldn&apos;t become outdated, and keeping it current shouldn&apos;t be another expense to
              organise. Included in every plan.
            </p>
            <p className="tile__more">
              <Link href="/winjo-refresh" className="arrow-link">
                How WINJO Refresh works <ArrowRight />
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
            <p className="tile__line">Each of these was designed from scratch for the business it serves.</p>
            <p className="tile__more">
              <Link href="/work" className="arrow-link">
                See all our work <ArrowRight />
              </Link>
            </p>
          </div>
        </div>
        <div className="container container--wide" data-reveal>
          <ul className="work-tiles" role="list">
            {work.map((p) => (
              <li key={p.slug} className="work-tile">
                {/* The picture repeats the "View project" link beneath it, so it is skipped by keyboards and screen readers. */}
                <Link href={`/work#${p.slug}`} className="work-tile__media" tabIndex={-1} aria-hidden="true">
                  <Image
                    src={p.desktop}
                    alt=""
                    sizes="(min-width: 64rem) 620px, 100vw"
                    placeholder="blur"
                    className="work-tile__shot"
                  />
                </Link>
                <div className="work-tile__body">
                  <h3 className="work-tile__name">
                    <Image src={p.logo} alt="" width={32} height={32} sizes="32px" className="work-tile__logo" aria-hidden />
                    {p.name}
                  </h3>
                  <p className="work-tile__line">{projectLine(p)}</p>
                  <p className="work-tile__links">
                    <Link href={`/work#${p.slug}`}>
                      View project<span className="visually-hidden">: {p.name}</span> <ArrowRight />
                    </Link>
                    {showsAddress(p) ? (
                      <a href={p.url} target="_blank" rel="noopener noreferrer">
                        View live<span className="visually-hidden">: {p.name} (opens in a new tab)</span> <span aria-hidden="true">↗</span>
                      </a>
                    ) : (
                      <VisitLogo name={p.name} url={p.url} logo={p.logo} />
                    )}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* How it works: a real sequence, so it keeps its numbers. */}
      <section id="process" data-nav="/managed-websites" className="tile home-tile" aria-labelledby="process-title">
        <div className="container container--wide tile__head" data-reveal>
          <p className="tile__name">How it works</p>
          <h2 id="process-title" className="tile__title">
            Four steps, then we keep looking after it.
          </h2>
          <div className="tile__aside">
            <p className="tile__line">Your first month is paid when you choose a plan. No minimum term.</p>
          </div>
        </div>
        <div className="container container--wide apps-tile__body">
          <WebStages />
        </div>
      </section>

      {/* The subscription and ownership, plainly. */}
      <section id="ownership" className="tile home-tile tile--soft" data-nav="/pricing" aria-labelledby="own-title">
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

      <CtaBand
        title={<>Let us look after your website.</>}
        body={
          <>
            Managed from {formatGBP(WEBSITE_PLANS.bronze.monthly)} a month, or own it outright from {formatGBP(ONE_OFF_WEBSITE.from)}.
            Questions first? <Link href="/faq">Read the FAQ</Link>.
          </>
        }
      >
        <Link href="/pricing" className="btn btn--primary">
          Choose a plan
        </Link>
        <Link href="/website-projects" className="btn btn--secondary">
          Own your website
        </Link>
        <Link href="/contact" className="arrow-link">
          Talk to us first <ArrowRight />
        </Link>
      </CtaBand>
    </>
  );
}
