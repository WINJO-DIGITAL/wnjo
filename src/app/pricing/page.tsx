import Link from "next/link";
import { CtaBand, PageHero, PricingNotice, SectionHead } from "@/components/Blocks";
import { Stopwatch } from "@/components/Icons";
import { HostingPicker, PlanFlow } from "@/components/interactive/PlanFlow";
import {
  AddOnsTable,
  OneOffWebsite,
  OwnershipPromise,
  PackageCards,
  PackageComparison,
} from "@/components/pricing/WebsitePackages";
import { pageMetadata } from "@/lib/metadata";
import { DAY_RATE, ONE_OFF_WEBSITE, SCOPED_FROM, SUBSCRIPTIONS, WEBSITE_PLANS, formatGBP } from "@/lib/pricing";

export const metadata = pageMetadata(
  "/pricing",
  "Website pricing",
  `Bespoke business websites from ${formatGBP(WEBSITE_PLANS.bronze.monthly)} a month, or a one-off bespoke website from ${formatGBP(ONE_OFF_WEBSITE.from)}. Hosting and care plans, add-on features, booking systems and custom software.`,
);

// Always flagged up front, whichever option is chosen.
const costRows: [string, string][] = [
  ["Domain registration and renewal", "Charged separately, or registered in your name"],
  ["Business email", "Charged separately by your email provider"],
  ["Paid plugins, fonts and software licences", "Charged separately, agreed in advance"],
  ["Third-party subscriptions and usage fees", "Paid directly to the provider"],
  ["Major new features after launch", "Quoted as separate work"],
  ["Work beyond a plan's monthly allowance", `Quoted before it starts, at ${formatGBP(DAY_RATE)} a day`],
];

export default function PricingPage() {
  return (
    <>
      <PageHero
        eyebrow="Pricing"
        title={<>Bespoke websites from {formatGBP(WEBSITE_PLANS.bronze.monthly)} a month.</>}
        lede={`Or a one-off bespoke website from ${formatGBP(ONE_OFF_WEBSITE.from)}. Every price is on this page, and confirmed in a written proposal before you commit.`}
      >
        <div className="btn-row">
          <Link href="/build" className="btn btn--primary">
            <Stopwatch />
            Build my quote
          </Link>
          <Link href="#compare" className="btn btn--secondary">
            Compare packages
          </Link>
        </div>
      </PageHero>

      {/* 1. Monthly website subscriptions: the main offer. */}
      <section id="monthly" className="section--tight" style={{ paddingTop: 0 }} aria-labelledby="monthly-title">
        <div className="container container--wide">
          <SectionHead eyebrow="Monthly" title={<span id="monthly-title">Monthly websites.</span>} split>
            <p>A bespoke website with hosting, maintenance and support in one monthly price.</p>
          </SectionHead>
          <div className="mt-6" data-reveal>
            <PackageCards />
          </div>
          <div className="mt-8" data-reveal>
            <OwnershipPromise />
          </div>
          <h3 id="compare" className="h3 mt-8" data-reveal>
            Compare packages
          </h3>
          <div className="mt-5" data-reveal>
            <PackageComparison />
          </div>
        </div>
      </section>

      {/* 2. One-off bespoke website, clearly separate. */}
      <section id="one-off" className="section section--ruled" aria-labelledby="oneoff-title">
        <div className="container container--wide">
          <SectionHead eyebrow="Pay up front" title={<span id="oneoff-title">One-off bespoke website.</span>} split>
            <p>Prefer to pay once? Own your website on full payment, with hosting and care as optional extras.</p>
          </SectionHead>
          <div data-reveal>
            <OneOffWebsite />
          </div>
        </div>
      </section>

      {/* 3. Hosting and maintenance, for websites paid up front. */}
      <PlanFlow>
        <section id="care" className="section section--ruled">
          <div className="container container--wide">
            <SectionHead eyebrow="After launch" title="Hosting and care." split>
              <p>
                For websites paid up front. Monthly packages already include hosting and maintenance, so they are never
                charged twice.
              </p>
            </SectionHead>
          </div>
          <div data-reveal>
            <HostingPicker />
          </div>
        </section>
      </PlanFlow>

      {/* 4. Additional website features. */}
      <section id="features" className="section section--ruled" aria-labelledby="features-title">
        <div className="container container--wide">
          <SectionHead eyebrow="Add more" title={<span id="features-title">Additional features.</span>} split>
            <p>Add them to any package. Anything your package already includes is never charged again.</p>
          </SectionHead>
          <div data-reveal>
            <AddOnsTable />
          </div>
        </div>
      </section>

      {/* 5 and 6. Simplify and Build: scoped and quoted separately. */}
      <section id="software" className="section section--ruled" aria-labelledby="software-title">
        <div className="container container--wide">
          <SectionHead
            eyebrow="Beyond websites"
            title={<span id="software-title">Booking systems and custom software.</span>}
            split
          >
            <p>Scoped to your business and quoted separately. Not squeezed into a website package.</p>
          </SectionHead>
          <div className="home-ways" data-reveal>
            <article className="home-way">
              <h3 className="home-way__name">Simplify: booking systems</h3>
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
              <h3 className="home-way__name">Build: apps and custom software</h3>
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

      <section className="section section--ruled" aria-labelledby="not-included">
        <div className="container container--wide">
          <h2 id="not-included" className="h3">
            What&apos;s not included in any price
          </h2>
          <p className="muted small mt-4">Always flagged up front.</p>
          <div className="table-wrap mt-5" role="region" aria-label="Costs not included in any price" tabIndex={0}>
            <table className="table table--stack">
              <thead>
                <tr>
                  <th scope="col">Item</th>
                  <th scope="col">How it&apos;s handled</th>
                </tr>
              </thead>
              <tbody>
                {costRows.map(([item, how]) => (
                  <tr key={item}>
                    <th scope="row">{item}</th>
                    <td className="muted">{how}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-6">
            <PricingNotice />
          </div>
        </div>
      </section>

      <CtaBand
        tone="light"
        title={<>What would yours cost?</>}
        body="Choose a package, add what you need, and see your first payment and monthly price as you go."
      >
        <Link href="/build" className="btn btn--primary">
          <Stopwatch />
          Build my quote
        </Link>
        <Link href="/contact?topic=website" className="btn btn--secondary">
          Talk to us
        </Link>
      </CtaBand>
    </>
  );
}
