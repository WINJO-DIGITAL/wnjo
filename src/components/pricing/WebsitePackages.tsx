import Link from "next/link";
import {
  ADD_ONS,
  CARE_PLANS,
  EXTRA_PAGE,
  LEGAL_REVIEW_PENDING,
  ONE_OFF_WEBSITE,
  REFRESH,
  WEBSITE_PLANS,
  formatGBP,
  type AddOnId,
  type WebsitePlanId,
} from "@/lib/pricing";

export const PLAN_ORDER: WebsitePlanId[] = ["bronze", "silver", "gold"];

/** The page anchor for each plan (/pricing#core, #plus, #pro). */
export const PLAN_ANCHOR: Record<WebsitePlanId, string> = { bronze: "core", silver: "plus", gold: "pro" };

/**
 * The highlights shown on each card, taken from the plan's own inclusions in lib/pricing; the full list is in the
 * comparison table. Nothing here adds to what a plan includes.
 */
export const CARD_POINTS: Record<WebsitePlanId, string[]> = {
  bronze: [
    "Bespoke design, up to 5 pages",
    "Managed hosting and SSL",
    "Security monitoring",
    "Maintenance, updates and fault resolution",
    "Basic SEO foundations",
    "Technical support and small agreed changes",
  ],
  silver: [
    "Everything in Core",
    "Bespoke design, up to 10 pages",
    "Enhanced and local SEO foundations",
    "Google Analytics and Search Console",
    "AEO foundations for AI-powered search",
    "Monthly performance snapshot",
    "1 hour of content changes a month",
    "Priority support, replies within 1 working day",
  ],
  gold: [
    "Everything in Plus",
    "Bespoke design, up to 20 pages",
    "Advanced SEO and technical optimisation",
    "Expanded AEO and GEO strategy",
    "Structured data for AI tools",
    "Quarterly performance reviews",
    "3 hours of changes a month",
    "Enhanced priority support, replies within 1 working day",
  ],
};

/**
 * Core, Pro (set apart) and Plus. Every figure comes from lib/pricing. The compact version (homepage) shows the
 * price, who it is for and a few highlights; the full version adds the rest.
 */
export function PackageCards({ compact = false }: { compact?: boolean }) {
  return (
    <ul className={`pkg-cards${compact ? " pkg-cards--compact" : ""}`} role="list">
      {PLAN_ORDER.map((id) => {
        const plan = WEBSITE_PLANS[id];
        const points = compact ? CARD_POINTS[id].slice(0, 4) : CARD_POINTS[id];
        return (
          <li key={id} id={compact ? undefined : PLAN_ANCHOR[id]} className={`pkg-card${plan.popular ? " pkg-card--popular inverse" : ""}`}>
            <h3 className="pkg-card__name">{plan.name}</h3>
            <p className="pkg-card__price">
              <span className="pkg-card__amount">{formatGBP(plan.monthly)}</span>
              <span className="pkg-card__unit">a month</span>
            </p>
            <p className="pkg-card__tagline">{plan.tagline}</p>
            {!compact && <p className="pkg-card__summary">{plan.bestFor}</p>}
            <ul className="pkg-card__points" role="list">
              {points.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
            {plan.refresh && (
              <p className="pkg-card__refresh">
                <Link href="/winjo-refresh">Winjo Refresh</Link> every {REFRESH.everyMonths} months
              </p>
            )}
            <Link
              href={`/build?plan=${id}`}
              className={`btn ${plan.popular ? "btn--primary" : "btn--secondary"} pkg-card__cta`}
            >
              Choose {plan.name}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

type Cell = string | boolean;
const tick = (v: Cell) =>
  v === true ? (
    <span className="cell-tick">
      <span className="visually-hidden">Included</span>
    </span>
  ) : v === false ? (
    <span className="muted">
      <span aria-hidden="true">–</span>
      <span className="visually-hidden">Not included</span>
    </span>
  ) : (
    v
  );

const has = (id: WebsitePlanId, addOn: AddOnId) => (WEBSITE_PLANS[id].includedAddOns as AddOnId[]).includes(addOn);
const from = (first: WebsitePlanId) => (id: WebsitePlanId) => PLAN_ORDER.indexOf(id) >= PLAN_ORDER.indexOf(first);

/** Everything each plan includes, side by side, grouped so the differences are easy to find. */
export function PackageComparison() {
  const groups: { title: string; rows: [string, (id: WebsitePlanId) => Cell][] }[] = [
    {
      title: "Your website",
      rows: [
        ["Monthly price", (id) => formatGBP(WEBSITE_PLANS[id].monthly)],
        ["Bespoke website design", () => true],
        ["Pages", (id) => `Up to ${WEBSITE_PLANS[id].pages}`],
        ["Mobile optimisation", () => true],
        ["Contact forms", () => true],
      ],
    },
    {
      title: "Looked after for you",
      rows: [
        ["Managed hosting and SSL certificate", () => true],
        ["Security monitoring", () => true],
        ["Technical maintenance and updates", () => true],
        ["Uptime monitoring and fault resolution", () => true],
        ["Support", (id) => WEBSITE_PLANS[id].support],
        ["Changes to your website", (id) => WEBSITE_PLANS[id].changes],
        [`Winjo Refresh every ${REFRESH.everyMonths} months`, (id) => WEBSITE_PLANS[id].refresh],
      ],
    },
    {
      title: "Being found",
      rows: [
        ["Search engine optimisation (SEO)", (id) => WEBSITE_PLANS[id].seo],
        ["Google Analytics and Search Console", from("silver")],
        ["Answer engine optimisation (AEO)", (id) => (id === "bronze" ? false : id === "silver" ? "Foundations" : "Expanded strategy")],
        ["Content written for AI answer engines", from("gold")],
        ["AI search visibility monitoring", (id) => (id === "gold" ? "Where available" : false)],
        ["Structured data for AI tools", from("gold")],
        ["Advanced SEO and technical optimisation", from("gold")],
        ["Performance reporting", (id) => (id === "bronze" ? false : id === "silver" ? "Monthly snapshot" : "Monthly snapshot and quarterly reviews")],
      ],
    },
    {
      title: "Your subscription",
      rows: [
        ["Term", () => "Rolling monthly"],
        ["Minimum contract", () => "None"],
      ],
    },
  ];
  return (
    <div className="table-wrap" role="region" aria-label="Compare Core, Plus and Pro" tabIndex={0}>
      <table className="table pkg-compare">
        <thead>
          <tr>
            <th scope="col">
              <span className="visually-hidden">Feature</span>
            </th>
            {PLAN_ORDER.map((id) => (
              <th key={id} scope="col" className={WEBSITE_PLANS[id].popular ? "pkg-compare__popular" : undefined}>
                {WEBSITE_PLANS[id].name}
                <span className="pkg-compare__tag">{formatGBP(WEBSITE_PLANS[id].monthly)} a month</span>
              </th>
            ))}
          </tr>
        </thead>
        {groups.map((group) => (
          <tbody key={group.title}>
            <tr className="pkg-compare__group">
              <th scope="colgroup" colSpan={PLAN_ORDER.length + 1}>
                {group.title}
              </th>
            </tr>
            {group.rows.map(([label, cell]) => (
              <tr key={label}>
                <th scope="row">{label}</th>
                {PLAN_ORDER.map((id) => (
                  <td key={id} className={WEBSITE_PLANS[id].popular ? "pkg-compare__popular" : undefined}>
                    {tick(cell(id))}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        ))}
      </table>
    </div>
  );
}

/**
 * Hosting and care for a website bought outright, side by side in the same table as the monthly plans, so the two
 * read as one family: the £99 plans include all of this; an outright website adds it by choice.
 */
export function CareComparison() {
  const keys = ["hosting", "care", "carePlus"] as const;
  const groups: { title: string; rows: [string, (key: (typeof keys)[number]) => Cell][] }[] = [
    {
      title: "Looked after for you",
      rows: [
        ["Managed hosting", () => true],
        ["SSL certificate", () => true],
        ["Uptime monitoring", () => true],
        ["Security updates", () => true],
      ],
    },
    {
      title: "Support and changes",
      rows: [
        ["Support", (k) => (k === "hosting" ? "Technical support" : k === "care" ? "Technical and email support" : "Technical and priority email support")],
        ["Routine updates", (k) => k !== "hosting"],
        ["Content changes each month", (k) => (k === "hosting" ? false : k === "care" ? "Up to 1 hour" : "Up to 3 hours of changes or improvements")],
        ["Quarterly performance and accessibility review", (k) => k === "carePlus"],
      ],
    },
  ];
  return (
    <div className="table-wrap" role="region" aria-label="Compare Hosting, Care and Care Plus" tabIndex={0}>
      <table className="table pkg-compare pkg-compare--care">
        <thead>
          <tr>
            <th scope="col">
              <span className="visually-hidden">Feature</span>
            </th>
            {keys.map((k) => (
              <th key={k} scope="col" className={k === "care" ? "pkg-compare__popular" : undefined}>
                {CARE_PLANS[k].label}
                <span className="pkg-compare__tag">{formatGBP(CARE_PLANS[k].monthly)} a month</span>
              </th>
            ))}
          </tr>
        </thead>
        {groups.map((group) => (
          <tbody key={group.title}>
            <tr className="pkg-compare__group">
              <th scope="colgroup" colSpan={keys.length + 1}>
                {group.title}
              </th>
            </tr>
            {group.rows.map(([label, cell]) => (
              <tr key={label}>
                <th scope="row">{label}</th>
                {keys.map((k) => (
                  <td key={k} className={k === "care" ? "pkg-compare__popular" : undefined}>
                    {tick(cell(k))}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        ))}
      </table>
    </div>
  );
}

/** Shown wherever the subscription's legal terms appear, until they are agreed and reviewed. */
export function LegalDraftNotice() {
  if (!LEGAL_REVIEW_PENDING) return null;
  return (
    <p className="notice notice--compact">
      <span>
        <strong>Draft terms.</strong> The cancellation, ownership and transfer terms are being finalised and will be
        confirmed in your written agreement before you subscribe.
      </span>
    </p>
  );
}

/** The one-off bespoke website, clearly separate from the monthly packages. */
export function OneOffWebsite() {
  return (
    <div className="oneoff">
      <div className="oneoff__price">
        <p className="pkg-card__name">{ONE_OFF_WEBSITE.name}</p>
        <p className="pkg-card__price">
          <span className="pkg-card__amount">from {formatGBP(ONE_OFF_WEBSITE.from)}</span>
        </p>
        <p className="pkg-card__setup">Paid up front, yours on full payment</p>
        <Link href="/build/project" className="btn btn--secondary">
          Get my proposal
        </Link>
      </div>
      <div className="oneoff__detail">
        <p className="oneoff__summary">{ONE_OFF_WEBSITE.summary}</p>
        <ul className="pkg-card__points" role="list">
          {ONE_OFF_WEBSITE.includes.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
        <p className="fine">
          Extra pages {formatGBP(EXTRA_PAGE.oneOff)} each. Hosting and maintenance from{" "}
          {formatGBP(CARE_PLANS.hosting.monthly)} a month, optional. Other functionality is quoted separately.
        </p>
      </div>
    </div>
  );
}

const ADD_ON_ORDER = Object.keys(ADD_ONS) as AddOnId[];

/** Every optional extra with its monthly and one-off price, and which plan already includes it. */
export function AddOnsTable() {
  const price = (n: number | null, from?: boolean, unit = "") =>
    n === null ? <span className="muted">–</span> : `${from ? "from " : ""}${formatGBP(n)}${unit}`;
  return (
    <div className="table-wrap" role="region" aria-label="Additional website features" tabIndex={0}>
      <table className="table table--stack">
        <thead>
          <tr>
            <th scope="col">Feature</th>
            <th scope="col">On a managed plan</th>
            <th scope="col">On a website project</th>
            <th scope="col">Included in</th>
          </tr>
        </thead>
        <tbody>
          {ADD_ON_ORDER.map((id) => {
            const a: (typeof ADD_ONS)[AddOnId] = ADD_ONS[id];
            const from = "from" in a && a.from === true;
            const quoted = "monthlyQuoted" in a && a.monthlyQuoted === true;
            const includedIn = PLAN_ORDER.filter((p) => has(p, id)).map((p) => WEBSITE_PLANS[p].name);
            return (
              <tr key={id}>
                <th scope="row">{a.label}</th>
                <td>{quoted ? "Custom subscription" : a.monthly !== null ? price(a.monthly, from, " a month") : price(a.oneOff, from, " once")}</td>
                <td>{a.oneOff !== null ? price(a.oneOff, from) : price(a.monthly, from, " a month")}</td>
                <td className="muted">{includedIn.length ? includedIn.join(", ") : "–"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="fine mt-4">
        Third-party fees, such as payment processing or booking and chat software, are paid to the provider and shown
        separately in your quote.
      </p>
    </div>
  );
}
