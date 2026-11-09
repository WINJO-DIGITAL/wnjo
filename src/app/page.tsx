import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CtaBand } from "@/components/Blocks";
import { BrowserFrame } from "@/components/Devices";
import { ArrowRight } from "@/components/Icons";
import { BookingDemo } from "@/components/interactive/BookingDemo";
import { SheetToApp } from "@/components/interactive/SheetToApp";
import { HeroShowcase } from "@/components/interactive/HeroShowcase";
import { SiteFan } from "@/components/interactive/SiteStyler";
import { StageSwiper } from "@/components/interactive/StageSwiper";
import { WebStages } from "@/components/WebStages";
import { WebsitesTile } from "@/components/WebsitesTile";
import { jost } from "@/lib/fonts";
import { ONE_OFF_WEBSITE, OWNERSHIP, formatGBP } from "@/lib/pricing";
import { PackageSelector } from "@/components/pricing/PackageSelector";
import { heroProjects, OWNER_QUOTES, projectBySlug } from "@/lib/projects";
import { OwnerQuotes } from "@/components/interactive/OwnerQuotes";
import { siteUrl } from "@/lib/site";
import { businessSchema } from "@/lib/structured-data";

// Title, description and share image come from the root layout; only the canonical URL is added here.
export const metadata: Metadata = siteUrl()
  ? { alternates: { canonical: "/" } }
  : {};

const evexec = projectBySlug("ev-exec")!;
const fystay = projectBySlug("fystay")!;
const evexecQuote = OWNER_QUOTES.find((q) => q.project.slug === "ev-exec")!;
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

      {/* Hero: the promise, the starting prices, the calculator, and our real work straight beneath. */}
      <section
        className="hero-ed hero-ed--work"
        data-nav="/work"
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
              <span className="hero-ed__line">Bespoke websites</span>{" "}
              <span className="serif-em">from £99 a month.</span>
            </h1>
            <p className="eyebrow hero-ed__place rise" style={{ "--i": 2 } as React.CSSProperties}>
              Based in Lancashire, working across the UK.
            </p>
            <p className="lede rise" style={{ "--i": 3 } as React.CSSProperties}>
              Hosting and support included. You own your website once your plan ends, or get a bespoke build from £999.
            </p>
            <div
              className="btn-row rise"
              style={{ "--i": 4 } as React.CSSProperties}
            >
              <Link href="/build" className="btn btn--primary">
                Build my website
              </Link>
              <Link href="/work" className="hero-ed__textlink">
                Explore our work
              </Link>
            </div>
          </div>
        </div>
        <div
          aria-label="Recent work"
          className="container container--wide showcase-section"
        >
          <HeroShowcase items={heroProjects} />
        </div>
      </section>

      {/* Pricing preview: the three monthly packages, Plus highlighted, the calculator as the next step. */}
      <section id="packages" className="tile home-tile" data-nav="/pricing" aria-labelledby="packages-title">
        <div className="container container--wide tile__head" data-reveal>
          <p className="tile__name">Website packages</p>
          <h2 id="packages-title" className="tile__title">
            A bespoke website, one monthly price.
          </h2>
          <div className="tile__aside">
            <p className="tile__line">
              Hosting, maintenance and support included. You own the website once your plan ends.
            </p>
            <p className="tile__more">
              <Link href="/pricing#compare" className="arrow-link">
                Compare every package <ArrowRight />
              </Link>
            </p>
          </div>
        </div>
        <div className="container container--wide" data-reveal>
          <PackageSelector />
          <p className="home-terms">
            Prefer to pay up front? <Link href="/pricing#one-off">Bespoke websites from {formatGBP(ONE_OFF_WEBSITE.from)}</Link>.
          </p>
        </div>
      </section>

      {/* What we do, in one line, before it's shown three ways. */}
      <section className="tile home-tile home-tile--intro" data-nav="/" aria-labelledby="what-title">
        <div className="container container--wide tile__head" data-reveal>
          <p className="tile__name">What we do</p>
          <h2 id="what-title" className="tile__title">
            Grow. Simplify. Build.
          </h2>
          <div className="tile__aside">
            <p className="tile__line">
              We find what&apos;s costing you customers and hours, then build the digital solution that fixes it.
            </p>
          </div>
        </div>
      </section>

      {/* Three acts: light, dark, light. On phones they sit side by side and swipe. */}
      <StageSwiper labels={["Grow", "Simplify", "Build"]}>
        {/* Grow: four example businesses, each with its own site. */}
        <WebsitesTile
          id="grow"
          navLink="/websites"
          compact
          name="Grow"
          title={<>A website that <span className="serif-em">brings in enquiries.</span></>}
          line="Bespoke websites, landing pages and lead capture, built for phones first."
          visual={<SiteFan />}
        />

        {/* Simplify: a customer books, the office is pinged. */}
        <section
          id="simplify"
          data-nav="/booking-software"
          className={`tile inverse home-tile ${jost.variable}`}
          aria-labelledby="simplify-title"
        >
          <div className="container container--wide tile__head" data-reveal>
            <p className="tile__name">Simplify</p>
            <h2 id="simplify-title" className="tile__title">
              Bookings that run <span className="serif-em">without a phone call.</span>
            </h2>
            <div className="tile__aside">
              <blockquote className="home-quote">
                <p>&ldquo;{evexecQuote.pull}&rdquo;</p>
                <footer>Owner, {evexec.name}</footer>
              </blockquote>
              <p className="tile__more">
                <Link href="/booking-software#make-it-yours" className="arrow-link">
                  Try the booking demo <ArrowRight />
                </Link>
              </p>
            </div>
          </div>
          <div className="container container--wide tile__visual tile__visual--pad" data-reveal>
            <BookingDemo />
          </div>
        </section>

        {/* Build: our own platform in the browser, and the spreadsheet that became an app. */}
        <section id="build" data-nav="/app-development" className="tile home-tile" aria-labelledby="build-title">
          <div className="container container--wide tile__head" data-reveal>
            <p className="tile__name">Build</p>
            <h2 id="build-title" className="tile__title">
              Stop running the business <span className="serif-em">from spreadsheets.</span>
            </h2>
            <div className="tile__aside">
              <p className="tile__line">
                Apps, portals and platforms. We run our own: <Link href="/work#fystay">{fystay.name}</Link>.
              </p>
              <div className="tile__ctas">
                <Link href="/contact?topic=bespoke" className="btn btn--primary">
                  Plan my app
                </Link>
                <Link href="/app-development" className="btn btn--secondary">
                  See how it works
                </Link>
              </div>
            </div>
          </div>
          <div className="container container--wide build-stage" data-reveal>
            <BrowserFrame
              src={fystay.desktop}
              alt={`The ${fystay.name} platform in a browser`}
              host={fystay.host}
              sizes="(min-width: 64rem) 720px, 100vw"
              className="build-stage__browser"
            />
            <div className="build-stage__app">
              <SheetToApp still />
            </div>
          </div>
        </section>
      </StageSwiper>

      {/* Work: each project as the problem it solved, with the live site. Swipes on phones. */}
      <section id="work" className="tile home-tile" data-nav="/work" aria-labelledby="work-title">
        <div className="container container--wide tile__head" data-reveal>
          <p className="tile__name">Our work</p>
          <h2 id="work-title" className="tile__title">
            Problems solved, in production.
          </h2>
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
                  <span className="home-work__problem">{p.challenge}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Our approach: a real sequence, so it keeps its numbers. */}
      <section id="process" data-nav="/about" className="tile home-tile" aria-labelledby="process-title">
        <div className="container container--wide tile__head" data-reveal>
          <p className="tile__name">How we work</p>
          <h2 id="process-title" className="tile__title">
            Four steps. No surprises.
          </h2>
          <div className="tile__aside">
            <p className="tile__line">Nothing to pay until you approve the scope.</p>
          </div>
        </div>
        <div className="container container--wide apps-tile__body">
          <WebStages />
        </div>
      </section>

      {/* The ownership promise, in short. */}
      <section className="tile inverse home-tile" data-nav="/pricing" aria-labelledby="own-title">
        <div className="container container--wide tile__head" data-reveal>
          <p className="tile__name">Ownership</p>
          <h2 id="own-title" className="tile__title">
            Your website. Your business. Your ownership.
          </h2>
          <div className="tile__aside">
            <p className="tile__line">
              A website should be a business asset, not something you rent forever. After{" "}
              {OWNERSHIP.ownershipAfterPayments} successful monthly payments, your agreed website is yours.
            </p>
            <p className="tile__more">
              <Link href="/pricing#monthly" className="arrow-link">
                How ownership works <ArrowRight />
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* Trust: the owners in their own words, and the terms we publish. */}
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
        title={<>Let&apos;s talk about your business.</>}
        body={<>Tell us what&apos;s getting in the way. We&apos;ll tell you honestly how we&apos;d fix it.</>}
      >
        <Link href="/build" className="btn btn--primary">
          Build my website
        </Link>
        <Link href="/contact" className="btn btn--secondary">
          Let&apos;s talk about your business
        </Link>
      </CtaBand>
    </>
  );
}
