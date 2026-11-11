import Link from "next/link";
import { CtaBand, PageHero, PricingNotice, SectionHead } from "@/components/Blocks";
import { ArrowRight } from "@/components/Icons";
import { RefreshCompare, SearchServices, SubscriptionTerms } from "@/components/managed/Sections";
import { AddOnsTable, PackageComparison } from "@/components/pricing/WebsitePackages";
import { PlanChooser } from "@/components/pricing/PlanChooser";
import { pageMetadata } from "@/lib/metadata";
import { CARE_PLANS, DAY_RATE, ONE_OFF_WEBSITE, REFRESH, WEBSITE_PLANS, formatGBP } from "@/lib/pricing";

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
        title={<>One monthly payment. One team looking after it.</>}
        lede={`Bespoke design, hosting, maintenance and support from ${formatGBP(core.monthly)} a month. Rolling monthly, with no minimum term.`}
      >
        <div className="btn-row">
          <Link href="#plans" className="btn btn--primary">
            Choose a plan
          </Link>
          <Link href="#compare" className="btn btn--secondary">
            Compare the plans
          </Link>
        </div>
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

      {/* 2b. After launch: hosting and care for a site you own. */}
      <section id="after-launch" className="section--tight" aria-labelledby="after-launch-title">
        <div className="container container--wide">
          <SectionHead eyebrow="After launch" title={<span id="after-launch-title">Hosting and care for a site you own.</span>} split>
            <p>If you keep your own website and want it looked after, these plans cover hosting and care. Rolling monthly, with 30 days&apos; notice to end.</p>
          </SectionHead>
          <div data-reveal style={{ display: "grid", gap: "2rem", gridTemplateColumns: "repeat(auto-fit, minmax(14rem, 1fr))" }}>
            {(["hosting", "care", "carePlus"] as const).map((key) => {
              const plan = CARE_PLANS[key];
              return (
                <article key={key}>
                  <h3>{plan.label}</h3>
                  <p>
                    <b>{formatGBP(plan.monthly)} a month</b>
                  </p>
                  <p>{plan.summary}</p>
                  <ul>
                    {plan.includes.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3. Winjo Refresh: the reason to choose Pro or Plus. */}
      <section id="refresh" className="section inverse" aria-labelledby="refresh-title">
        <div className="container container--wide">
          <SectionHead
            eyebrow={`Included in ${pro.name} and ${plus.name}`}
            title={<span id="refresh-title">Winjo Refresh: a design refresh every {REFRESH.everyMonths} months.</span>}
            split
          >
            <p>
              Your website shouldn&apos;t become outdated, and keeping it current shouldn&apos;t become another expense
              to organise.
            </p>
            <p className="mt-4">
              <Link href="/winjo-refresh" className="arrow-link">
                How Winjo Refresh works <ArrowRight />
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
          <SectionHead eyebrow="Your subscription" title={<span id="terms-title">No lock-in. Here&apos;s how it works.</span>} split>
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
            Prefer to buy your website outright?{" "}
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
