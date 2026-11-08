import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CtaBand } from "@/components/Blocks";
import { ArrowRight } from "@/components/Icons";
import { BookingDemo } from "@/components/interactive/BookingDemo";
import { SheetToApp } from "@/components/interactive/SheetToApp";
import { HeroShowcase } from "@/components/interactive/HeroShowcase";
import { WebStages } from "@/components/WebStages";
import { WebsitesTile } from "@/components/WebsitesTile";
import { jost } from "@/lib/fonts";
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

      {/* Hero: one sentence, two next steps, and our real work straight beneath. */}
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
              <span className="hero-ed__line">More enquiries,</span>{" "}
              <span className="hero-ed__line">less admin,</span>{" "}
              <span className="serif-em">and software that fits.</span>
            </h1>
            <div
              className="btn-row rise"
              style={{ "--i": 2 } as React.CSSProperties}
            >
              <Link href="/contact" className="btn btn--primary">
                Let&apos;s talk about your business
              </Link>
              <Link href="/work" className="btn btn--secondary">
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

      {/* Grow: the live site that restyles itself for four businesses. */}
      <WebsitesTile
        id="grow"
        navLink="/websites"
        compact
        name="Grow"
        title="A website that brings in enquiries."
        line="Bespoke websites, landing pages and lead capture, built for phones first."
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
            Bookings that run without a phone call.
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

      {/* Build: the spreadsheet becomes an app; FYStay is our own platform. */}
      <section id="build" data-nav="/app-development" className="tile home-tile" aria-labelledby="build-title">
        <div className="container container--wide tile__head" data-reveal>
          <p className="tile__name">Build</p>
          <h2 id="build-title" className="tile__title">
            Stop running the business from spreadsheets.
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
        <div className="tile__sta" data-reveal style={{ "--d": 1 } as React.CSSProperties}>
          <SheetToApp still />
        </div>
      </section>

      {/* Work: each project as the problem it solved. */}
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
                <Image src={p.logo} alt="" width={44} height={44} sizes="44px" className="home-work__logo" />
                <span className="home-work__name">{p.name}</span>
                <span className="home-work__problem">{p.challenge}</span>
              </Link>
            </li>
          ))}
        </ul>
        </div>
      </section>

      {/* Our approach. */}
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

      {/* Two ways to work with us: the subscription first. */}
      <section className="tile home-tile" data-nav="/pricing" aria-labelledby="ways-title">
        <div className="container container--wide tile__head" data-reveal>
          <p className="tile__name">Ways to work with us</p>
          <h2 id="ways-title" className="tile__title">
            Keep it running, or buy it once.
          </h2>
        </div>
        <div className="container container--wide home-ways" data-reveal>
          <article className="home-way">
            <h3 className="home-way__name">Monthly subscription</h3>
            <ul className="home-way__terms" role="list">
              <li>The build cost spread across monthly payments</li>
              <li>Hosting, maintenance, support and agreed improvements</li>
              <li>12-month minimum term, then 30 days&apos; notice</li>
              <li>Your domain and content stay yours. Buy it outright any time.</li>
            </ul>
            <Link href="/pricing#ways" className="arrow-link">
              How the subscription works <ArrowRight />
            </Link>
          </article>
          <article className="home-way">
            <h3 className="home-way__name">Bespoke project</h3>
            <ul className="home-way__terms" role="list">
              <li>A one-off fee for the deliverables we agree</li>
              <li>Hosting, maintenance and support billed separately</li>
              <li>An optional development retainer</li>
            </ul>
            <Link href="/build" className="arrow-link">
              Get my price <ArrowRight />
            </Link>
          </article>
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
        <p className="container container--wide home-terms" data-reveal>
          A written quote before you commit · Nothing to pay until you approve the scope · 50% to start, 50% once
          you&apos;re happy
        </p>
      </section>

      <CtaBand
        title={<>Let&apos;s talk about your business.</>}
        body={<>Tell us what&apos;s getting in the way. We&apos;ll tell you honestly how we&apos;d fix it.</>}
      >
        <Link href="/contact" className="btn btn--primary">
          Let&apos;s talk about your business
        </Link>
        <Link href="/build" className="btn btn--secondary">
          Get my price
        </Link>
      </CtaBand>
    </>
  );
}
