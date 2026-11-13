import Link from "next/link";
import { ArrowRight } from "@/components/Icons";
import { REFRESH, SUBSCRIPTION_TERMS, WEBSITE_PLANS } from "@/lib/pricing";
import { RefreshSlider } from "./RefreshSlider";

/**
 * Search and AI services in business terms: the benefit first, then the name it goes by and the plans that include
 * it (taken from each plan's inclusions in lib/pricing). No rankings, AI visibility or recommendations are promised.
 */
const CORE = WEBSITE_PLANS.bronze.name;
const PRO = WEBSITE_PLANS.silver.name;
const PLUS = WEBSITE_PLANS.gold.name;

export const SEARCH_SERVICES: { benefit: string; term: string; line: string; plans: string }[] = [
  {
    benefit: "Easier to find on Google",
    term: "SEO",
    line: "Your website built and maintained so search engines can read it properly.",
    plans: `${CORE} (basic), ${PRO} (enhanced and local), ${PLUS} (advanced)`,
  },
  {
    benefit: "Know who is visiting, and what they do",
    term: "Google Analytics",
    line: "See how people arrive and how they use your website.",
    plans: `${PRO} and ${PLUS}`,
  },
  {
    benefit: "Spot search problems early",
    term: "Google Search Console",
    line: "We watch how Google indexes your website and how it performs in search.",
    plans: `${PRO} and ${PLUS}`,
  },
  {
    benefit: "Clear answers for answer engines",
    term: "AEO, answer engine optimisation",
    line: "Content structured so answer engines can understand and interpret it.",
    plans: `${PRO} (foundations), ${PLUS} (expanded)`,
  },
  {
    benefit: "Ready for AI-powered search",
    term: "GEO, generative engine optimisation",
    line: "Clearer structure and wording for discovery through AI search experiences.",
    plans: PLUS,
  },
  {
    benefit: "Easier for AI tools to read",
    term: "Structured data",
    line: "Your business details marked up so AI tools can read them accurately.",
    plans: PLUS,
  },
];

export function SearchServices() {
  return (
    <>
      <ul role="list" className="search-list">
        {SEARCH_SERVICES.map((s) => (
          <li key={s.term}>
            <h3 className="search-list__benefit">{s.benefit}</h3>
            <p className="search-list__line">{s.line}</p>
            <p className="search-list__meta">
              <span>{s.term}</span>
              <span>{s.plans}</span>
            </p>
          </li>
        ))}
      </ul>
      <p className="fine search-list__note">
        These give your website strong foundations. Nobody can honestly guarantee rankings, AI visibility or
        recommendations, and we don&apos;t.
      </p>
    </>
  );
}

/**
 * How the subscription and ownership work, in plain words. Only the principles the owner has confirmed are stated.
 * Notice periods, transfer arrangements and fees are NOT agreed yet, so the "if you leave" column says where they
 * will be confirmed instead of inventing them.
 */
export function SubscriptionTerms() {
  return (
    <div className="terms-grid">
      <div>
        <p className="terms-grid__label">While you subscribe</p>
        <ul role="list" className="checks">
          <li>Rolling monthly, with no minimum contract term</li>
          <li>No large upfront website cost</li>
          <li>We host, maintain and manage your website</li>
        </ul>
      </div>
      <div>
        <p className="terms-grid__label">Always yours</p>
        <ul role="list" className="checks">
          <li>Your domain name</li>
          <li>The content you supply: your words, images and brand</li>
        </ul>
      </div>
      <div>
        <p className="terms-grid__label">Ours</p>
        <ul role="list" className="checks">
          <li>The code and framework we build your website on, subject to your agreed service terms</li>
        </ul>
      </div>
      <div>
        <p className="terms-grid__label">If you leave</p>
        <p className="terms-grid__text">
          Cancel any time, with no notice and no cancellation fee. Your plan ends at the end of the month you have paid for. We send you your content and
          design files within {SUBSCRIPTION_TERMS.handoverDays} days, and keep your site live for{" "}
          {SUBSCRIPTION_TERMS.liveAfterEndDays} days so you can move it. Your domain stays yours.
        </p>
      </div>
    </div>
  );
}

/** The refresh, shown rather than listed: the same example website before and after, with a handle to drag between. */
export function RefreshCompare() {
  return (
    <div className="rf-compare">
      <RefreshSlider />
      <p className="rf-compare__line">
        We plan it, design it and include it every {REFRESH.everyMonths} months on every plan, at the level that fits your site.
      </p>
    </div>
  );
}

export function RefreshLink() {
  return (
    <Link href="/winjo-refresh" className="arrow-link">
      How WINJO Refresh works <ArrowRight />
    </Link>
  );
}
