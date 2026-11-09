import Link from "next/link";
import { ArrowRight } from "@/components/Icons";
import { SiteStyler } from "@/components/interactive/SiteStyler";
import { archivo, jost } from "@/lib/fonts";
import { ONE_OFF_WEBSITE, OWNERSHIP, WEBSITE_PLANS, formatGBP } from "@/lib/pricing";

/**
 * Websites, sold by showing: the headline, both prices in one row, and the example site
 * that restyles for four businesses. Shared by the homepage and the Websites page.
 */
export function WebsitesTile({
  id,
  navLink,
  ctas = false,
  compact = false,
  name = "Websites",
  title = "Built to win customers.",
  line = "Designed around your business, built for phones first.",
  visual,
}: {
  id?: string;
  navLink?: string;
  /** Show the price button beside the prices link (the homepage; the Websites page has them in its hero). */
  ctas?: boolean;
  /** Homepage version: just the headline, one line and the live demo, with no prices or trust row. */
  compact?: boolean;
  name?: string;
  title?: React.ReactNode;
  line?: string;
  /** Replaces the interactive styler (the homepage shows the four sites as a fan). */
  visual?: React.ReactNode;
}) {
  const titleId = `${id ?? "websites"}-title`;
  return (
    <section
      id={id}
      data-nav={navLink}
      className={`tile${compact ? " home-tile" : ""} ${jost.variable} ${archivo.variable}`}
      aria-labelledby={titleId}
    >
      <div className="container container--wide tile__head" data-reveal>
        <p className="tile__name">{name}</p>
        <h2 id={titleId} className="tile__title">
          {title}
        </h2>
        <div className="tile__aside">
          <p className="tile__line">{line}</p>
          {!compact && (<>
          {/* Both prices in one place: the website, and the care that keeps it running. */}
          <dl className="price-pair">
            <div>
              <dt>Monthly from</dt>
              <dd>
                {formatGBP(WEBSITE_PLANS.bronze.monthly)}
                <span>/month</span>
              </dd>
            </div>
            <div>
              <dt>Bespoke from</dt>
              <dd>{formatGBP(ONE_OFF_WEBSITE.from)}</dd>
            </div>
          </dl>
          {/* Reasons to trust the price, each one a published commitment rather than a claim. */}
          <ul className="trust-row" role="list">
            <li>See your price as you build your quote</li>
            <li>Hosting and support included monthly</li>
            <li>You own the website after {OWNERSHIP.ownershipAfterPayments} payments</li>
          </ul>
          </>)}
          {compact ? (
            <p className="tile__more">
              <Link href="/websites" className="arrow-link">
                See websites <ArrowRight />
              </Link>
            </p>
          ) : ctas ? (
            <div className="tile__ctas">
              <Link href="/pricing" className="btn btn--secondary">
                See all prices
              </Link>
            </div>
          ) : (
            <p className="tile__more">
              <Link href="/pricing" className="arrow-link">
                See all prices <ArrowRight />
              </Link>
            </p>
          )}
        </div>
      </div>
      <div
        className="container container--wide tile__visual"
        data-reveal
        style={{ "--d": 1 } as React.CSSProperties}
      >
        {visual ?? <SiteStyler />}
      </div>
    </section>
  );
}
