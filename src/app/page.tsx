import type { Metadata } from "next";
import Link from "next/link";
import { CtaBand } from "@/components/Blocks";
import { ArrowRight } from "@/components/Icons";
import { BookingDemo } from "@/components/interactive/BookingDemo";
import { SheetToApp } from "@/components/interactive/SheetToApp";
import { HeroShowcase } from "@/components/interactive/HeroShowcase";
import { WebStages } from "@/components/WebStages";
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

/** What we solve, phrased as the thing a business owner would say. */
const PROBLEMS = [
  "Enquiries sit unanswered in an inbox.",
  "Bookings are taken by phone, one at a time.",
  "The same admin gets repeated every week.",
  "The website looks fine but doesn't turn visitors into customers.",
];

/** The outcomes the work is designed to reach. Intentions, not measured results. */
const OUTCOMES = [
  "Turn visitors into enquiries.",
  "Let customers book without calling.",
  "Take repetitive admin off your desk.",
  "Make your business look as capable as it is.",
];

/** Services grouped by the goal a business has, not by the technology used. */
const SERVICE_GROUPS = [
  {
    goal: "Grow your business",
    line: "Get found, get enquiries, get customers who trust you.",
    items: "Websites, landing pages, lead generation and online presence",
    href: "/websites",
    cta: "See websites",
  },
  {
    goal: "Simplify your operations",
    line: "Less admin, fewer missed bookings, clearer day-to-day running.",
    items: "Booking systems, workflow automation, customer management and dashboards",
    href: "/booking-software",
    cta: "See booking software",
  },
  {
    goal: "Build something bespoke",
    line: "Software shaped around a problem that no off-the-shelf tool solves.",
    items: "Custom software, web apps, client portals, integrations and SaaS products",
    href: "/app-development",
    cta: "See app development",
  },
];

export default function HomePage() {
  const schema = businessSchema(siteUrl() ?? "https://winjodigital.co.uk");
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      {/* 1. Hero: the outcome in one line, with our real work straight beneath it. */}
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
              <Link href="#work" className="btn btn--secondary">
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

      {/* 2. What we do. */}
      <section className="tile home-tile" data-nav="/" aria-labelledby="what-title">
        <div className="container container--wide tile__head" data-reveal>
          <p className="tile__name">What we do</p>
          <h2 id="what-title" className="tile__title">
            Every project starts with a problem.
          </h2>
          <div className="tile__aside">
            <p className="tile__line">
              We find what&apos;s costing you customers and hours, then build the digital solution that fixes it.
            </p>
          </div>
        </div>
      </section>

      {/* 3. Business problems we solve. */}
      <section className="tile home-tile" data-nav="/" aria-labelledby="problems-title">
        <div className="container container--wide tile__head" data-reveal>
          <p className="tile__name">Problems we solve</p>
          <h2 id="problems-title" className="tile__title">
            Where businesses lose time and customers.
          </h2>
        </div>
        <div className="container container--wide" data-reveal>
          <ul className="home-plain" role="list">
            {PROBLEMS.map((problem) => (
              <li key={problem}>{problem}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* 4. Outcomes we help businesses achieve. */}
      <section className="tile inverse home-tile" data-nav="/" aria-labelledby="outcomes-title">
        <div className="container container--wide tile__head" data-reveal>
          <p className="tile__name">Outcomes</p>
          <h2 id="outcomes-title" className="tile__title">
            What changes when it works.
          </h2>
        </div>
        <div className="container container--wide" data-reveal>
          <ul className="home-plain home-plain--large" role="list">
            {OUTCOMES.map((outcome) => (
              <li key={outcome}>{outcome}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* 5. Services organised around business goals. */}
      <section className="tile home-tile" data-nav="/" aria-labelledby="services-title">
        <div className="container container--wide tile__head" data-reveal>
          <p className="tile__name">Services</p>
          <h2 id="services-title" className="tile__title">
            Start with the goal, not the tool.
          </h2>
        </div>
        <div className="container container--wide home-groups" data-reveal>
          {SERVICE_GROUPS.map((group) => (
            <article key={group.goal} className="home-group">
              <h3 className="home-group__goal">{group.goal}</h3>
              <p className="home-group__line">{group.line}</p>
              <p className="home-group__items">{group.items}.</p>
              <Link href={group.href} className="arrow-link">
                {group.cta} <ArrowRight />
              </Link>
            </article>
          ))}
        </div>
      </section>

      {/* Proof of the two most common builds, shown working. */}
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
            <p className="tile__line">Get bookings while you&apos;re busy working. Proven every day at {evexec.name}.</p>
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

      {/* 6. Selected work, explained as solutions. */}
      <section id="work" className="tile home-tile" data-nav="/work" aria-labelledby="work-title">
        <div className="container container--wide tile__head" data-reveal>
          <p className="tile__name">Our work</p>
          <h2 id="work-title" className="tile__title">
            Problems solved, in production.
          </h2>
        </div>
        <div className="container container--wide home-solutions" data-reveal>
          {heroProjects.map((project) => (
            <article key={project.slug} className="home-solution">
              <p className="home-solution__meta">
                {project.name} · {project.location}
              </p>
              <h3 className="home-solution__title">{project.summary}</h3>
              <p className="home-solution__text">{project.challenge}</p>
              <Link href="/work" className="arrow-link">
                See the project <ArrowRight />
              </Link>
            </article>
          ))}
        </div>
      </section>

      {/* 7. Our approach. */}
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

      {/* 8. Two ways to work with us. */}
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
            <p className="home-way__text">
              A monthly payment for a solution that stays live and keeps improving. Hosting, maintenance and
              support are included. The minimum term is agreed in writing before you start.
            </p>
            <Link href="/pricing" className="arrow-link">
              See the plans <ArrowRight />
            </Link>
          </article>
          <article className="home-way">
            <h3 className="home-way__name">Bespoke project</h3>
            <p className="home-way__text">
              A one-off fee for the deliverables we agree together. Hosting, maintenance and support are billed
              separately, and an ongoing care retainer is optional. The scope is confirmed before any binding price.
            </p>
            <Link href="/contact?topic=bespoke" className="arrow-link">
              Plan my project <ArrowRight />
            </Link>
          </article>
        </div>
      </section>

      {/* 9. Trust: the owners in their own words, and the commitments we publish. */}
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
        <div className="container container--wide home-trust" data-reveal>
          <p>A written quote before you commit.</p>
          <p>Nothing to pay until you approve the scope.</p>
          <p>50% to start, 50% once you&apos;re happy.</p>
        </div>
      </section>

      {/* 10. Closing call to action. */}
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
