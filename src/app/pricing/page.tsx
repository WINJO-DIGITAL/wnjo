import Link from "next/link";
import {
  CtaBand,
  PageHero,
  PricingNotice,
  SectionHead,
} from "@/components/Blocks";
import { Stopwatch } from "@/components/Icons";
import {
  HostingPicker,
  PackagePicker,
  PlanFlow,
} from "@/components/interactive/PlanFlow";
import { PaymentTimeline } from "@/components/PaymentTimeline";
import { PricingSteps } from "@/components/PricingSteps";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata(
  "/pricing",
  "Pricing",
  "Two ways to work with WINJO DIGITAL: a monthly subscription that keeps your website or software running and improving, or a one-off bespoke project. Starting prices and care plans.",
);

// Always flagged up front, whichever plan is chosen.
const costRows: [string, string][] = [
  [
    "Domain registration and renewal",
    "Charged separately, or registered in your name",
  ],
  ["Business email", "Charged separately by your email provider"],
  [
    "Paid plugins, fonts and software licences",
    "Charged separately, agreed in advance",
  ],
  ["Third-party subscriptions and usage fees", "Paid directly to the provider"],
  ["Major new features after launch", "Quoted as separate work"],
  ["Work beyond a plan's monthly allowance", "Quoted before it starts"],
];

/** Every price in one place; the homepage and the Websites page link here rather than showing the cards. */
export default function PricingPage() {
  return (
    <>
      <PageHero
        eyebrow="Pricing"
        title={
          <>
            Clear prices. No surprises.
          </>
        }
        lede="Pay monthly and we keep it running, or pay once and own it. Every price is confirmed in writing before you commit."
      >
        <div className="btn-row">
          <Link href="/build" className="btn btn--primary">
            <Stopwatch />
            Get my price
          </Link>
          <Link href="#ways" className="btn btn--secondary">
            Ways to work with us
          </Link>
        </div>
      </PageHero>

      <section id="ways" className="section--tight" style={{ paddingTop: 0 }} aria-labelledby="ways-title">
        <div className="container container--wide">
          <h2 id="ways-title" className="h2" data-reveal>
            Two ways to work with us.
          </h2>
          <div className="mt-6" data-reveal>
            <PaymentTimeline />
          </div>
          <div className="home-ways" data-reveal>
            <article className="home-way">
              <h3 className="home-way__name">Monthly subscription</h3>
              <p className="home-way__text">For a website or system you want kept live and improving.</p>
              <ul className="home-way__terms" role="list">
                <li>The build cost spread across monthly payments, so there&apos;s little or nothing to pay up front</li>
                <li>Hosting, maintenance, security updates and support included</li>
                <li>Agreed improvements each month, depending on the plan</li>
                <li>12-month minimum term, then 30 days&apos; notice</li>
                <li>Your domain and content are always yours, and you can buy the build outright at any time</li>
              </ul>
              <Link href="/contact" className="arrow-link">
                Talk to us about a subscription
              </Link>
            </article>
            <article className="home-way">
              <h3 className="home-way__name">Bespoke project</h3>
              <p className="home-way__text">For a defined build you want to own from day one.</p>
              <ul className="home-way__terms" role="list">
                <li>A one-off fee for the deliverables we agree in writing</li>
                <li>50% to start, 50% once you&apos;re happy</li>
                <li>Hosting, maintenance and support billed separately, or host it yourself</li>
                <li>An optional development retainer for ongoing work</li>
              </ul>
              <Link href="/build" className="arrow-link">
                Get my price
              </Link>
            </article>
          </div>
          <p className="muted small mt-6">
            Subscription prices depend on what we build and are confirmed in your written quote. The starting
            prices below are for bespoke projects.
          </p>
        </div>
      </section>

      <section
        className="section--tight"
        style={{ paddingTop: 0 }}
        aria-label="How the money works"
      >
        <PricingSteps />
      </section>

      <PlanFlow>
        <section
          id="packages"
          className="section--tight"
          style={{ paddingTop: 0 }}
          aria-labelledby="packages-title"
        >
          <h2 id="packages-title" className="visually-hidden">
            Websites and apps
          </h2>
          <div data-reveal>
            <PackagePicker />
          </div>
          <div
            className="container container--wide mt-6"
            style={{ display: "grid", gap: "var(--space-5)" }}
          >
            <PricingNotice />
            <p className="muted small">
              Over 25 pages, customer accounts or custom integrations? We scope
              it on a short call first.
            </p>
          </div>
        </section>

        <section id="care" className="section section--ruled">
          <div className="container container--wide">
            <SectionHead
              eyebrow="After launch"
              title={
                <>
                  Hosting and care,{" "}
                  priced separately.
                </>
              }
              split
            >
              <p>
                Optional monthly plans. You can also host the site yourself.{" "}
                <Link href="#not-included">What&apos;s not included</Link>.
              </p>
            </SectionHead>
          </div>
          <div data-reveal>
            <HostingPicker />
          </div>

          <div className="container container--wide">
            <h3 id="not-included" className="h3 mt-8">
              What&apos;s not included in any plan
            </h3>
            <p className="muted small mt-4">Always flagged up front.</p>
            <div
              className="table-wrap mt-5"
              role="region"
              aria-label="Costs not included in any plan"
              tabIndex={0}
            >
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
          </div>
        </section>
      </PlanFlow>

      <CtaBand
        tone="light"
        title={
          <>
            What would yours cost?
          </>
        }
        body="Nine quick steps to an instant estimate you can send us."
      >
        <Link href="/build" className="btn btn--primary">
          <Stopwatch />
          Get my price
        </Link>
        <Link href="/contact?topic=website" className="btn btn--secondary">
          Talk to us
        </Link>
      </CtaBand>
    </>
  );
}
