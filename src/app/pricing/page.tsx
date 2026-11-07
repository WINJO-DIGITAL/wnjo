import Link from "next/link";
import { CtaBand, PageHero, PricingNotice, SectionHead } from "@/components/Blocks";
import { Stopwatch } from "@/components/Icons";
import { PlanSwiper } from "@/components/interactive/PlanSwiper";
import { PricingSteps } from "@/components/PricingSteps";
import { pageMetadata } from "@/lib/metadata";
import { appPlanCard, carePlanCards, packagePlanCards } from "@/lib/plans";

export const metadata = pageMetadata(
  "/pricing",
  "Pricing",
  "Starting prices for WNJO websites and app development, and optional hosting and care plans.",
);

// Always flagged up front, whichever plan is chosen.
const costRows: [string, string][] = [
  ["Domain registration and renewal", "Charged separately, or registered in your name"],
  ["Business email", "Charged separately by your email provider"],
  ["Paid plugins, fonts and software licences", "Charged separately, agreed in advance"],
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
            Clear prices. <span className="serif-em">No surprises.</span>
          </>
        }
        lede="Starting prices for bespoke work, confirmed in writing before you commit."
      >
        <div className="btn-row">
          <Link href="/build" className="btn btn--primary">
            <Stopwatch />
            Get my price
          </Link>
          <Link href="#care" className="btn btn--secondary">
            Hosting &amp; care
          </Link>
        </div>
      </PageHero>

      <section className="section--tight" style={{ paddingTop: 0 }} aria-label="How the money works">
        <PricingSteps />
      </section>

      <section id="packages" className="section--tight" style={{ paddingTop: 0 }} aria-labelledby="packages-title">
        <h2 id="packages-title" className="visually-hidden">
          Websites and apps
        </h2>
        <div data-reveal>
          <PlanSwiper plans={[...packagePlanCards, appPlanCard]} label="Starting prices" />
        </div>
        <div className="container container--wide mt-6" style={{ display: "grid", gap: "var(--space-5)" }}>
          <PricingNotice />
          <p className="muted small">
            Over 25 pages, customer accounts or custom integrations? We scope it on a short call first.
          </p>
        </div>
      </section>

      <section id="care" className="section section--ruled">
        <div className="container container--wide">
          <SectionHead
            eyebrow="After launch"
            title={
              <>
                Hosting and care, <span className="serif-em">priced separately.</span>
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
          <PlanSwiper plans={carePlanCards} label="Hosting and care plans" />
        </div>

        <div className="container container--wide">
          <h3 id="not-included" className="h3 mt-8">
            What&apos;s not included in any plan
          </h3>
          <p className="muted small mt-4">Always flagged up front.</p>
          <div className="table-wrap mt-5" role="region" aria-label="Costs not included in any plan" tabIndex={0}>
            <table className="table">
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

      <CtaBand
        title={
          <>
            What would <span className="serif-em">yours cost?</span>
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
