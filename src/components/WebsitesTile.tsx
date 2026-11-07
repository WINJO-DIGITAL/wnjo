import Link from "next/link";
import { ArrowRight, Stopwatch } from "@/components/Icons";
import { SiteStyler } from "@/components/interactive/SiteStyler";
import { archivo, jost } from "@/lib/fonts";
import { CARE_PLANS, PACKAGES, formatGBP } from "@/lib/pricing";

/**
 * Websites, sold by showing: the headline, both prices in one row, and the example site
 * that restyles for four businesses. Shared by the homepage and the Websites page.
 */
export function WebsitesTile({
  id,
  navLink,
  ctas = false,
}: {
  id?: string;
  navLink?: string;
  /** Show the price button beside the prices link (the homepage; the Websites page has them in its hero). */
  ctas?: boolean;
}) {
  const titleId = `${id ?? "websites"}-title`;
  return (
    <section
      id={id}
      data-nav={navLink}
      className={`tile ${jost.variable} ${archivo.variable}`}
      aria-labelledby={titleId}
    >
      <div className="container container--wide" data-reveal>
        <p className="tile__name">Websites</p>
        <h2 id={titleId} className="tile__title">
          Built to win <span className="serif-em">customers.</span>
        </h2>
        <p className="tile__line">Bespoke design, fast on every phone.</p>
        {/* Both prices in one place: the website, and the care that keeps it running. */}
        <dl className="price-pair">
          <div>
            <dt>Website from</dt>
            <dd>{formatGBP(PACKAGES.essential.from)}</dd>
          </div>
          <div>
            <dt>Hosting &amp; care</dt>
            <dd>
              {formatGBP(CARE_PLANS.hosting.monthly)}
              <span>/month</span>
            </dd>
          </div>
        </dl>
        {ctas ? (
          <div className="tile__ctas">
            <Link href="/build" className="btn btn--primary">
              <Stopwatch />
              Get my price
            </Link>
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
      <div className="container container--wide tile__visual" data-reveal style={{ "--d": 1 } as React.CSSProperties}>
        <SiteStyler />
      </div>
    </section>
  );
}
