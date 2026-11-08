import type { Metadata } from "next";
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

export default function HomePage() {
  const schema = businessSchema(siteUrl() ?? "https://winjodigital.co.uk");
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      {/* Hero: the outcome in one line, with our real work straight beneath it. */}
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
              <span className="hero-ed__line">Better business,</span>{" "}
              <span className="serif-em">through better technology.</span>
            </h1>
            <div
              className="btn-row rise"
              style={{ "--i": 3 } as React.CSSProperties}
            >
              <Link href="/contact?topic=other" className="btn btn--primary">
                Let&apos;s solve your business problem
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

      {/* Grow: the live site that restyles itself for four businesses. */}
      <WebsitesTile
        id="web-design"
        navLink="/websites"
        compact
        name="Grow your business"
        title="A website that brings in enquiries."
        line="Designed around your business, built for phones first."
      />

      {/* Simplify: a customer books, the office is pinged. */}
      <section
        id="booking"
        data-nav="/booking-software"
        className={`tile inverse home-tile ${jost.variable}`}
        aria-labelledby="booking-title"
      >
        <div className="container container--wide tile__head" data-reveal>
          <p className="tile__name">Simplify your operations</p>
          <h2 id="booking-title" className="tile__title">
            Bookings that run without a phone call.
          </h2>
          <div className="tile__aside">
            <p className="tile__line">Proven every day at {evexec.name}.</p>
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

      {/* Bespoke: the spreadsheet becomes an app. */}
      <section id="apps" data-nav="/app-development" className="tile home-tile" aria-labelledby="apps-title">
        <div className="container container--wide tile__head" data-reveal>
          <p className="tile__name">Build something bespoke</p>
          <h2 id="apps-title" className="tile__title">
            Stop running the business from spreadsheets.
          </h2>
          <div className="tile__aside">
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

      {/* Proof: the owners, in their own words. */}
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

      {/* How it works, shown as four steps. */}
      <section id="process" data-nav="/about" className="tile home-tile" aria-labelledby="process-title">
        <div className="container container--wide tile__head" data-reveal>
          <p className="tile__name">How we work</p>
          <h2 id="process-title" className="tile__title">
            Four steps. No surprises.
          </h2>
          <div className="tile__aside">
            <p className="tile__line">
              We find what&apos;s costing you customers and hours, then build the digital solution that fixes it.
              Nothing to pay until you approve the scope.
            </p>
          </div>
        </div>
        <div className="container container--wide apps-tile__body">
          <WebStages />
        </div>
      </section>

      {/* Two ways to work with us. */}
      <section className="tile home-tile" data-nav="/pricing" aria-labelledby="ways-title">
        <div className="container container--wide tile__head" data-reveal>
          <p className="tile__name">Ways to work with us</p>
          <h2 id="ways-title" className="tile__title">
            Keep it running, or build it once.
          </h2>
        </div>
        <div className="container container--wide home-ways" data-reveal>
          <article className="home-way">
            <h3 className="home-way__name">Digital solution subscription</h3>
            <p className="home-way__text">Monthly. Hosting, maintenance, support and improvements included.</p>
            <Link href="/pricing" className="arrow-link">
              See the plans <ArrowRight />
            </Link>
          </article>
          <article className="home-way">
            <h3 className="home-way__name">Bespoke project</h3>
            <p className="home-way__text">A one-off fee for what we agree. Care and support optional.</p>
            <Link href="/contact?topic=bespoke" className="arrow-link">
              Plan my project <ArrowRight />
            </Link>
          </article>
        </div>
      </section>

      <CtaBand
        title={<>Let&apos;s solve your business problem.</>}
        body={<>Tell us what&apos;s getting in the way. We&apos;ll tell you honestly how we&apos;d fix it.</>}
      >
        <Link href="/contact?topic=other" className="btn btn--primary">
          Let&apos;s solve your business problem
        </Link>
        <Link href="/contact" className="btn btn--secondary">
          Tell us what you want to achieve
        </Link>
      </CtaBand>
    </>
  );
}
