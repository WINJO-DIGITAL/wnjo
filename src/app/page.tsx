import type { Metadata } from "next";
import Link from "next/link";
import { CtaBand, PricingNotice } from "@/components/Blocks";
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
    items: ["Conversion-focused websites", "Landing pages", "Lead generation", "Online presence"],
    href: "/websites",
    cta: "See websites",
  },
  {
    goal: "Simplify your operations",
    line: "Less admin, fewer missed bookings, clearer day-to-day running.",
    items: ["Booking and appointment systems", "Workflow automation", "Customer management", "Operational dashboards"],
    href: "/booking-software",
    cta: "See booking software",
  },
  {
    goal: "Build something bespoke",
    line: "Software shaped around a problem that no off-the-shelf tool solves.",
    items: ["Custom software and web apps", "Client portals", "Integrations", "SaaS products"],
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
            <p
              className="lede rise"
              style={{ "--i": 2 } as React.CSSProperties}
            >
              We find what&apos;s costing you customers and hours, then build the digital solution that fixes it.
            </p>
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

      {/* 2. What we do: the mechanism, shown as a sequence rather than described. */}
      <section className="tile" data-nav="/" aria-labelledby="what-title">
        <div className="container container--wide tile__head" data-reveal>
          <p className="tile__name">What we do</p>
          <h2 id="what-title" className="tile__title">
            Every project starts with <span className="serif-em">a problem.</span>
          </h2>
        </div>
        <div className="container container--wide home-flow" data-reveal>
          <p className="home-flow__step">The problem</p>
          <span className="home-flow__arrow" aria-hidden="true">
            <ArrowRight />
          </span>
          <p className="home-flow__step">The digital solution</p>
          <span className="home-flow__arrow" aria-hidden="true">
            <ArrowRight />
          </span>
          <p className="home-flow__step home-flow__step--result">The result for your business</p>
        </div>
      </section>

      {/* 3. Business problems we solve. */}
      <section className="tile" data-nav="/" aria-labelledby="problems-title">
        <div className="container container--wide tile__head" data-reveal>
          <p className="tile__name">Problems we solve</p>
          <h2 id="problems-title" className="tile__title">
            Where businesses lose <span className="serif-em">time and customers.</span>
          </h2>
        </div>
        <div className="container container--wide" data-reveal>
          <ol className="home-list">
            {PROBLEMS.map((problem, i) => (
              <li key={problem}>
                <span className="home-list__num" aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span>{problem}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 4. Outcomes we help businesses achieve. */}
      <section className="tile inverse" data-nav="/" aria-labelledby="outcomes-title">
        <div className="container container--wide tile__head" data-reveal>
          <p className="tile__name">Outcomes</p>
          <h2 id="outcomes-title" className="tile__title">
            What changes <span className="serif-em">when it works.</span>
          </h2>
        </div>
        <div className="container container--wide" data-reveal>
          <ul className="home-outcomes" role="list">
            {OUTCOMES.map((outcome) => (
              <li key={outcome}>{outcome}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* 5. Services organised around business goals. */}
      <section className="tile" data-nav="/" aria-labelledby="services-title">
        <div className="container container--wide tile__head" data-reveal>
          <p className="tile__name">Services</p>
          <h2 id="services-title" className="tile__title">
            Start with the goal, <span className="serif-em">not the tool.</span>
          </h2>
        </div>
        <div className="container container--wide home-groups" data-reveal>
          {SERVICE_GROUPS.map((group) => (
            <article key={group.goal} className="home-group">
              <h3 className="home-group__goal">{group.goal}</h3>
              <p className="home-group__line">{group.line}</p>
              <ul className="home-group__items" role="list">
                {group.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
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
        className={`tile inverse ${jost.variable}`}
        aria-labelledby="booking-title"
      >
        <div className="container container--wide tile__head" data-reveal>
          <p className="tile__name">Simplify your operations</p>
          <h2 id="booking-title" className="tile__title">
            Bookings that run <span className="serif-em">without a phone call.</span>
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

      <section id="apps" data-nav="/app-development" className="tile" aria-labelledby="apps-title">
        <div className="container container--wide tile__head" data-reveal>
          <p className="tile__name">Build something bespoke</p>
          <h2 id="apps-title" className="tile__title">
            Built around <span className="serif-em">how you work.</span>
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

      {/* 6. Selected work, explained as solutions: the problem, what we built, what it's for. */}
      <section id="work" className="tile" data-nav="/work" aria-labelledby="work-title">
        <div className="container container--wide tile__head" data-reveal>
          <p className="tile__name">Our work</p>
          <h2 id="work-title" className="tile__title">
            Problems solved, <span className="serif-em">in production.</span>
          </h2>
        </div>
        <div className="container container--wide home-solutions" data-reveal>
          {heroProjects.map((project) => (
            <article key={project.slug} className="home-solution">
              <p className="home-solution__meta">
                {project.name} · {project.location}
              </p>
              <h3 className="home-solution__title">{project.summary}</h3>
              <dl className="home-solution__facts">
                <div>
                  <dt>The problem</dt>
                  <dd>{project.challenge}</dd>
                </div>
                <div>
                  <dt>What we built</dt>
                  <dd>{project.solution}</dd>
                </div>
              </dl>
              <Link href="/work" className="arrow-link">
                See the project <ArrowRight />
              </Link>
            </article>
          ))}
        </div>
      </section>

      {/* 7. Our approach. */}
      <section id="process" data-nav="/about" className="tile" aria-labelledby="process-title">
        <div className="container container--wide tile__head" data-reveal>
          <p className="tile__name">How we work</p>
          <h2 id="process-title" className="tile__title">
            Four steps. <span className="serif-em">No surprises.</span>
          </h2>
          <div className="tile__aside">
            <p className="tile__line">Nothing to pay until you approve the scope.</p>
          </div>
        </div>
        <div className="container container--wide apps-tile__body">
          <WebStages />
        </div>
      </section>

      {/* 8. Two ways to work with us. The subscription is the default for ongoing solutions. */}
      <section className="tile" data-nav="/pricing" aria-labelledby="ways-title">
        <div className="container container--wide tile__head" data-reveal>
          <p className="tile__name">Ways to work with us</p>
          <h2 id="ways-title" className="tile__title">
            Keep it running, <span className="serif-em">or build it once.</span>
          </h2>
        </div>
        <div className="container container--wide home-ways" data-reveal>
          <article className="home-way home-way--primary">
            <p className="home-way__label">Recommended for most businesses</p>
            <h3 className="home-way__name">Digital solution subscription</h3>
            <ul className="home-way__items" role="list">
              <li>A monthly payment for a solution that stays live and improving</li>
              <li>Hosting, maintenance and support included</li>
              <li>Ongoing improvements, by plan</li>
              <li>Minimum term and terms agreed in writing</li>
            </ul>
            <Link href="/pricing" className="arrow-link">
              See the plans <ArrowRight />
            </Link>
          </article>
          <article className="home-way">
            <p className="home-way__label">One-off build</p>
            <h3 className="home-way__name">Bespoke project</h3>
            <ul className="home-way__items" role="list">
              <li>A one-off fee for the deliverables we agree together</li>
              <li>Hosting, maintenance and support billed separately</li>
              <li>An optional ongoing care or development retainer</li>
              <li>Scope confirmed before any binding price</li>
            </ul>
            <Link href="/contact?topic=bespoke" className="arrow-link">
              Plan my project <ArrowRight />
            </Link>
          </article>
        </div>
        <div className="container container--wide home-ways__notice">
          <PricingNotice compact />
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
          <ul className="trust-row" role="list">
            <li>A written quote before you commit</li>
            <li>Nothing to pay until you approve the scope</li>
            <li>50% to start, 50% once you&apos;re happy</li>
          </ul>
        </div>
      </section>

      {/* 10. Closing call to action. */}
      <CtaBand
        title={
          <>
            Let&apos;s solve your <span className="serif-em">business problem.</span>
          </>
        }
        body={<>Tell us what you want to achieve. We&apos;ll tell you honestly how we&apos;d do it.</>}
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
