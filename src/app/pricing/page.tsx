import Link from "next/link";
import { CtaBand, PageHero, PricingNotice, SectionHead } from "@/components/Blocks";
import { ArrowRight } from "@/components/Icons";
import { RefreshCompare, SearchServices, SubscriptionTerms } from "@/components/managed/Sections";
import { AddOnsTable, CareComparison, PackageComparison } from "@/components/pricing/WebsitePackages";
import { PlanChooser } from "@/components/pricing/PlanChooser";
import { pageMetadata } from "@/lib/metadata";
import { DAY_RATE, ONE_OFF_WEBSITE, REFRESH, WEBSITE_PLANS, formatGBP } from "@/lib/pricing";

const { bronze: core, silver: pro, gold: plus } = WEBSITE_PLANS;

export const metadata = pageMetadata(
  "/pricing",
  "Managed website pricing",
  `Fully managed websites on a rolling monthly subscription: ${core.name} ${formatGBP(core.monthly)}, ${pro.name} ${formatGBP(pro.monthly)} and ${plus.name} ${formatGBP(plus.monthly)} a month. Bespoke design, hosting, maintenance and support included, with no minimum term.`,
);

// Always flagged up front, whichever plan is chosen.
const costRows: [string, string][] = [
  ["Domain registration and renewal", "Registered in your name and paid to the registrar"],
  ["Business email", "Charged separately by your email provider"],
  ["Paid plugins, fonts and software licences", "Charged separately, agreed in advance"],
  ["Third-party subscriptions and usage fees", "Paid directly to the provider"],
  ["Major new features", "Quoted as separate work"],
  ["Work beyond your plan's monthly allowance", `Quoted before it starts, at ${formatGBP(DAY_RATE)} a day`],
];

export default function PricingPage() {
  return (
    <>
      <PageHero
        compact
        eyebrow="Pricing"
        title={<>One monthly payment covers all of it.</>}
        lede={`Bespoke design, hosting, maintenance and support from ${formatGBP(core.monthly)} a month. Rolling monthly, with no minimum term.`}
      >
        <div className="btn-row">
          <Link href="#plans" className="btn btn--primary">
            Choose a plan
          </Link>
        </div>
        <p className="mt-4">
          <Link href="#compare">Compare what each plan includes.</Link>
        </p>
      </PageHero>

      {/* 1. The three plans. */}
      <section id="plans" className="section--tight" style={{ paddingTop: 0 }} aria-label="Plans">
        <div className="container container--wide">
          <div data-reveal>
            <PlanChooser />
          </div>
          <p className="plans-note" data-reveal>
            Every plan is a rolling monthly subscription with no minimum contract and no large upfront cost. Change
            plan as your business changes.
          </p>
        </div>
      </section>

      {/* 2. Side by side. */}
      <section id="compare" className="section section--ruled" aria-labelledby="compare-title">
        <div className="container container--wide">
          <SectionHead eyebrow="Compare" title={<span id="compare-title">What each plan includes.</span>} split>
            <p>
              {core.name} covers the essentials. {pro.name} keeps your website improving. {plus.name} adds more of our
              time and deeper search work.
            </p>
          </SectionHead>
          <div data-reveal>
            <PackageComparison />
          </div>
          <p className="fine mt-5">
            Monthly change allowances don&apos;t carry over to the next month. Work beyond them is quoted before we start,
            at {formatGBP(DAY_RATE)} a day. The full terms are on our <Link href="/terms">terms page</Link>.
          </p>
        </div>
      </section>

      {/* 2b. Bought outright: hosting and care are added. The monthly plans already include all of it. */}
      <section id="after-launch" className="section--tight" aria-labelledby="after-launch-title">
        <div className="container container--wide">
          <SectionHead eyebrow="Own your website?" title={<span id="after-launch-title">Add hosting and care to your website.</span>} split>
            <p>
              Every managed plan already includes all of this, so you only have to run your business. If you buy your website
              outright, add hosting and care below. Rolling monthly, with 30 days&apos; notice to end.{" "}
              <a href="#plans">See the monthly plans</a>, or <Link href="/build/hosting">get hosting only</Link>.
            </p>
          </SectionHead>
          <div className="included-panel" data-reveal>
            <p className="included-panel__label">Included in every managed plan</p>
            <ul className="checks included-panel__list" role="list">
              <li>Bespoke design for your business</li>
              <li>Managed hosting and SSL</li>
              <li>Security, updates and upkeep</li>
              <li>A real team to ask for help</li>
            </ul>
          </div>
          <div data-reveal>
            <CareComparison />
          </div>
        </div>
      </section>

      {/* 3. WINJO Refresh: included in every plan. */}
      <section id="refresh" className="section inverse" aria-labelledby="refresh-title">
        <div className="container container--wide">
          <SectionHead
            eyebrow="Included in every plan"
            title={<span id="refresh-title">WINJO Refresh: a design refresh every {REFRESH.everyMonths} months.</span>}
            split
          >
            <p>
              Your website shouldn&apos;t become outdated, and keeping it current shouldn&apos;t become another expense
              to organise.
            </p>
            <p className="mt-4">
              <Link href="/winjo-refresh" className="arrow-link">
                How WINJO Refresh works <ArrowRight />
              </Link>
            </p>
          </SectionHead>
          <div data-reveal>
            <RefreshCompare />
          </div>
        </div>
      </section>

      {/* 4. The subscription and ownership, plainly. */}
      <section id="how-it-works" className="section" aria-labelledby="terms-title">
        <div className="container container--wide">
          <SectionHead eyebrow="Your subscription" title={<span id="terms-title">How it works, with no lock-in.</span>} split>
            <p>What&apos;s yours, what&apos;s ours, and what happens if you leave.</p>
          </SectionHead>
          <div data-reveal>
            <SubscriptionTerms />
          </div>
        </div>
      </section>

      {/* 5. The search services behind Pro and Plus. */}
      <section id="search" className="section section--ruled" aria-labelledby="search-title">
        <div className="container container--wide">
          <SectionHead eyebrow="Being found" title={<span id="search-title">What the search work means for you.</span>} split>
            <p>The benefit first, then the name it goes by and the plans that include it.</p>
          </SectionHead>
          <div data-reveal>
            <SearchServices />
          </div>
        </div>
      </section>

      {/* 6. Optional extras. */}
      <section id="features" className="section section--ruled" aria-labelledby="features-title">
        <div className="container container--wide">
          <SectionHead eyebrow="Optional extras" title={<span id="features-title">Add what your business needs.</span>} split>
            <p>Anything your plan already includes is never charged again.</p>
          </SectionHead>
          <div data-reveal>
            <AddOnsTable />
          </div>
        </div>
      </section>

      <section className="section section--ruled" aria-labelledby="not-included">
        <div className="container container--wide">
          <h2 id="not-included" className="h3">
            What&apos;s not included in any plan
          </h2>
          <p className="muted small mt-4">Always flagged up front.</p>
          <div className="table-wrap mt-5" role="region" aria-label="Costs not included in any plan" tabIndex={0}>
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
          <p className="mt-6">
            Prefer to own your website?{" "}
            <Link href="/website-projects">Website projects start from {formatGBP(ONE_OFF_WEBSITE.from)}</Link>.
          </p>
        </div>
      </section>

      <CtaBand
        tone="light"
        title={<>Not sure which plan fits?</>}
        body="Compare the three plans, or talk to us and we'll recommend one. Nothing is charged until you agree to go ahead."
      >
        <Link href="#plans" className="btn btn--primary">
          Choose a plan
        </Link>
        <Link href="/contact?topic=website" className="btn btn--secondary">
          Talk to us first
        </Link>
      </CtaBand>
    </>
  );
}
