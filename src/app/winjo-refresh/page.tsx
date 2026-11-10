import Link from "next/link";
import { CtaBand, PageHero, SectionHead } from "@/components/Blocks";
import { RefreshTimeline } from "@/components/managed/RefreshTimeline";
import { RefreshCompare } from "@/components/managed/Sections";
import { pageMetadata } from "@/lib/metadata";
import { REFRESH, WEBSITE_PLANS, formatGBP } from "@/lib/pricing";

const { silver: pro, gold: plus } = WEBSITE_PLANS;

export const metadata = pageMetadata(
  "/winjo-refresh",
  "Winjo Refresh",
  `Winjo Refresh is a planned website design and experience refresh every ${REFRESH.everyMonths} months, included in the ${pro.name} and ${plus.name} managed website plans. Your website stays current without another redesign to organise.`,
);

// What a refresh covers, as the owner has defined it.
const covers: [string, string][] = [
  ["A modern look", "Your website's appearance brought up to date."],
  ["A better experience", "Improvements to how visitors find and do things."],
  ["Your business as it is now", "New services, new priorities, reflected properly."],
  ["A website that feels current", "Never the one that looks five years old."],
  ["Still unmistakably you", "Consistent with your brand."],
];

export default function WinjoRefreshPage() {
  return (
    <>
      <PageHero
        eyebrow="Winjo Refresh"
        title={<>Your website shouldn&apos;t become outdated.</>}
        lede={`And keeping it current shouldn't become another expense to organise. Every ${REFRESH.everyMonths} months, we redesign it for you.`}
      >
        <div className="btn-row">
          <Link href="/pricing#plans" className="btn btn--primary">
            See the plans that include it
          </Link>
        </div>
      </PageHero>

      {/* The idea, shown: one website over four years. */}
      <section className="section--tight inverse refresh-stage" aria-label="The same website at launch and after each refresh">
        <div className="container container--wide" data-reveal>
          <RefreshTimeline />
        </div>
      </section>

      {/* The problem it removes. */}
      <section id="why" className="section" aria-labelledby="why-title">
        <div className="container container--wide">
          <SectionHead eyebrow="Why it matters" title={<span id="why-title">The redesign you never have to organise.</span>} split>
            <p>
              Every website dates. Normally that means finding a designer, paying for a redesign and managing the
              project yourself. With Winjo Refresh, it&apos;s already planned and already paid for.
            </p>
          </SectionHead>
          <div data-reveal>
            <RefreshCompare />
          </div>
        </div>
      </section>

      {/* What it covers. */}
      <section id="covers" className="section section--ruled" aria-labelledby="covers-title">
        <div className="container container--wide">
          <SectionHead eyebrow="What you get" title={<span id="covers-title">A planned design and experience refresh.</span>} split>
            <p>Every {REFRESH.everyMonths} months, for as long as you&apos;re on {pro.name} or {plus.name}.</p>
          </SectionHead>
          <ul role="list" className="managed-list managed-list--wide" data-reveal>
            {covers.map(([title, line]) => (
              <li key={title}>
                <h3>{title}</h3>
                <p>{line}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* What it is not, said plainly. */}
      <section id="scope" className="section section--ruled" aria-labelledby="scope-title">
        <div className="container container--wide">
          <SectionHead eyebrow="Good to know" title={<span id="scope-title">A defined service, clearly scoped.</span>} split>
            <p>
              Winjo Refresh is a refresh of your website&apos;s design and experience. It isn&apos;t unlimited
              redevelopment, or an unlimited number of new pages and features: those are quoted separately. What your
              refresh covers is set out in your written agreement.
            </p>
          </SectionHead>
        </div>
      </section>

      {/* The plans that include it. */}
      <section id="plans" className="section section--ruled" aria-labelledby="plans-title">
        <div className="container container--wide">
          <SectionHead eyebrow="Included" title={<span id="plans-title">Part of {pro.name} and {plus.name}.</span>} split>
            <p>No extra charge. It&apos;s one of the reasons to choose them.</p>
          </SectionHead>
          <div className="home-ways" data-reveal>
            {[pro, plus].map((plan) => (
              <article key={plan.name} className="home-way">
                <h3 className="home-way__name">
                  {plan.name}: {formatGBP(plan.monthly)} a month
                </h3>
                <p className="home-way__text">{plan.bestFor}</p>
                <Link href={`/pricing#${plan.name.toLowerCase()}`} className="arrow-link">
                  See what {plan.name} includes
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <CtaBand
        tone="light"
        title={<>A website that stays current.</>}
        body={`Winjo Refresh is included in ${pro.name} and ${plus.name}, from ${formatGBP(pro.monthly)} a month with no minimum term.`}
      >
        <Link href={`/build?plan=silver`} className="btn btn--primary">
          Get started with {pro.name}
        </Link>
        <Link href="/pricing" className="btn btn--secondary">
          Compare the plans
        </Link>
      </CtaBand>
    </>
  );
}
