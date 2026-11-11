import Link from "next/link";
import { CtaBand, PageHero, SectionHead } from "@/components/Blocks";
import { HostingPicker, PlanFlow } from "@/components/interactive/PlanFlow";
import { OneOffWebsite } from "@/components/pricing/WebsitePackages";
import { pageMetadata } from "@/lib/metadata";
import { ONE_OFF_WEBSITE, SCOPED_FROM, SUBSCRIPTIONS, WEBSITE_PLANS, formatGBP } from "@/lib/pricing";

export const metadata = pageMetadata(
  "/website-projects",
  "Website projects",
  `Prefer to buy your website outright? A bespoke website project from ${formatGBP(ONE_OFF_WEBSITE.from)}, yours on full payment, with optional hosting and care.`,
);

export default function WebsiteProjectsPage() {
  return (
    <>
      <PageHero
        eyebrow="Website projects"
        title={<>Prefer to buy your website outright?</>}
        lede={`A bespoke website from ${formatGBP(ONE_OFF_WEBSITE.from)}, paid up front and yours on full payment.`}
      >
        <div className="btn-row">
          <Link href="/build/project" className="btn btn--primary">
            Get my proposal
          </Link>
          <Link href="/contact?topic=website" className="btn btn--secondary">
            Talk to us
          </Link>
        </div>
      </PageHero>

      <section id="one-off" className="section--tight" style={{ paddingTop: 0 }} aria-label="The website project">
        <div className="container container--wide">
          <div data-reveal>
            <OneOffWebsite />
          </div>
          <p className="plans-note" data-reveal>
            Would rather not pay up front? A <Link href="/managed-websites">managed website</Link> includes the
            design, hosting, maintenance and updates from {formatGBP(WEBSITE_PLANS.bronze.monthly)} a month.
          </p>
        </div>
      </section>

      {/* Hosting and care for websites bought outright. */}
      <PlanFlow>
        <section id="care" className="section section--ruled">
          <div className="container container--wide">
            <SectionHead eyebrow="After launch" title="Hosting and care." split>
              <p>Optional, for websites bought outright. Managed plans already include it.</p>
            </SectionHead>
          </div>
          <div data-reveal>
            <HostingPicker />
          </div>
        </section>
      </PlanFlow>

      {/* Booking systems and custom software: scoped and quoted separately. */}
      <section id="software" className="section section--ruled" aria-labelledby="software-title">
        <div className="container container--wide">
          <SectionHead eyebrow="Beyond websites" title={<span id="software-title">Booking systems and custom software.</span>} split>
            <p>Scoped to your business and quoted separately.</p>
          </SectionHead>
          <div className="home-ways" data-reveal>
            <article className="home-way">
              <h3 className="home-way__name">Booking systems</h3>
              <p className="home-way__text">
                Bookings, payments, an operator app and automation. From {formatGBP(SCOPED_FROM.bookingSystem)}, or{" "}
                {formatGBP(SUBSCRIPTIONS.simplify.monthly)} a month with a {formatGBP(SUBSCRIPTIONS.simplify.setup)}{" "}
                setup fee.
              </p>
              <Link href="/booking-software" className="arrow-link">
                See booking systems
              </Link>
            </article>
            <article className="home-way">
              <h3 className="home-way__name">Apps and custom software</h3>
              <p className="home-way__text">
                Portals, platforms, internal tools and integrations. From {formatGBP(SCOPED_FROM.software)}, or from{" "}
                {formatGBP(SUBSCRIPTIONS.build.monthly)} a month.
              </p>
              <Link href="/app-development" className="arrow-link">
                See app development
              </Link>
            </article>
          </div>
        </div>
      </section>

      <CtaBand
        tone="light"
        title={<>Tell us about your project.</>}
        body="A fixed price in writing before any work starts. Nothing to pay until you approve it."
      >
        <Link href="/build/project" className="btn btn--primary">
          Get my proposal
        </Link>
        <Link href="/contact?topic=website" className="btn btn--secondary">
          Talk to us
        </Link>
      </CtaBand>
    </>
  );
}
