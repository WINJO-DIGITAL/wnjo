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
  const schema = businessSchema(siteUrl() ?? "https://www.wnjoweb.co.uk");
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      {/*
        Hero: the message, then our real work straight beneath it, crisp and live: the
        project showcase (laptop and phone, walkthroughs playing, tabs to switch site).
      */}
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
              <span className="hero-ed__line">One business.</span>{" "}
              <span className="hero-ed__line">One site.</span>{" "}
              <span className="serif-em">Built from scratch.</span>
            </h1>
            <p
              className="lede rise"
              style={{ "--i": 2 } as React.CSSProperties}
            >
              Bespoke websites, apps and booking software for cafés, salons and
              trades. Priced upfront.
            </p>
          </div>
        </div>
        <div
          aria-label="Recent work"
          className="container container--wide showcase-section"
        >
          <HeroShowcase items={heroProjects} />
        </div>
      </section>

      {/* The owners of EV Exec and Boonma, in their own words (approved by them), right after the line that says they're ours. Phones swipe between them. */}
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

      {/*
        Below the showcase, one product per screen: a name, a few words, one link and a
        big visual. Detail and full pricing live on the service pages.
      */}
      <WebsitesTile id="web-design" navLink="/websites" ctas />

      {/* Booking software, shown working: a customer books, the office is pinged. */}
      <section
        id="booking"
        data-nav="/booking-software"
        className={`tile inverse ${jost.variable}`}
        aria-labelledby="booking-title"
      >
        <div className="container container--wide tile__head" data-reveal>
          <p className="tile__name">Booking software</p>
          <h2 id="booking-title" className="tile__title">
            Booking apps, <span className="serif-em">for any business.</span>
          </h2>
          <div className="tile__aside">
            <p className="tile__line">Proven every day at {evexec.name}.</p>
            <p className="tile__more">
              <Link
                href="/booking-software#make-it-yours"
                className="arrow-link"
              >
                Try the booking demo <ArrowRight />
              </Link>
            </p>
          </div>
        </div>
        <div
          className="container container--wide tile__visual tile__visual--pad"
          data-reveal
        >
          <BookingDemo />
        </div>
      </section>

      <section
        id="apps"
        data-nav="/app-development"
        className="tile"
        aria-labelledby="apps-title"
      >
        <div className="container container--wide tile__head" data-reveal>
          <p className="tile__name">App development</p>
          <h2 id="apps-title" className="tile__title">
            Built around <span className="serif-em">how you work.</span>
          </h2>
          <div className="tile__aside">
            <p className="tile__line">
              Web and mobile apps, portals and tools.
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
        {/* The App development hero's finished app (it plays in full on that page). */}
        <div
          className="tile__sta"
          data-reveal
          style={{ "--d": 1 } as React.CSSProperties}
        >
          <SheetToApp still />
        </div>
      </section>

      <section
        id="process"
        data-nav="/about"
        className="tile"
        aria-labelledby="process-title"
      >
        <div className="container container--wide tile__head" data-reveal>
          <p className="tile__name">How it works</p>
          <h2 id="process-title" className="tile__title">
            Four steps. <span className="serif-em">No surprises.</span>
          </h2>
          <div className="tile__aside">
            <p className="tile__line">
              Nothing to pay until you approve the scope.
            </p>
          </div>
        </div>
        <div className="container container--wide apps-tile__body">
          <WebStages />
        </div>
      </section>

      <CtaBand
        title={
          <>
            Your business <span className="serif-em">could be next.</span>
          </>
        }
        body={
          <>
            Tell us what you need. Honest advice and a clear next step.{" "}
            <Link href="/faq">Questions?</Link>
          </>
        }
      >
        <Link href="/contact?topic=website" className="btn btn--secondary">
          Talk to us
        </Link>
      </CtaBand>
    </>
  );
}
