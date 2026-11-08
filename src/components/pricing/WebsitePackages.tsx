import Link from "next/link";
import {
  ADD_ONS,
  CARE_PLANS,
  EXTRA_PAGE,
  LEGAL_REVIEW_PENDING,
  ONE_OFF_WEBSITE,
  OWNERSHIP,
  WEBSITE_PLANS,
  formatGBP,
  type AddOnId,
  type WebsitePlanId,
} from "@/lib/pricing";

const PLAN_ORDER: WebsitePlanId[] = ["bronze", "silver", "gold"];

/** The highlights shown on each card; the full list is in the comparison table. */
export const CARD_POINTS: Record<WebsitePlanId, string[]> = {
  bronze: ["Bespoke design", "Up to 3 pages", "Hosting, SSL and security updates", "Standard support"],
  silver: [
    "More advanced bespoke design",
    "Up to 5 pages",
    "Gallery, testimonials and WhatsApp",
    "Lead notification emails",
    "1 hour of content updates a month",
    "Priority support",
  ],
  gold: [
    "Fully bespoke design and animation",
    "Up to 10 pages",
    "Blog, advanced forms and booking",
    "Conversion tracking",
    "2 hours of content updates a month",
    "Priority support",
  ],
};

/** Core, Plus (highlighted) and Pro. Every figure comes from lib/pricing. */
export function PackageCards({ compact = false }: { compact?: boolean }) {
  return (
    <ul className={`pkg-cards${compact ? " pkg-cards--compact" : ""}`} role="list">
      {PLAN_ORDER.map((id) => {
        const plan = WEBSITE_PLANS[id];
        return (
          <li key={id} className={`pkg-card${plan.popular ? " pkg-card--popular inverse" : ""}`}>
            {plan.popular && <p className="pkg-card__badge">Most popular</p>}
            <h3 className="pkg-card__name">{plan.name}</h3>
            <p className="pkg-card__price">
              <span className="pkg-card__amount">{formatGBP(plan.monthly)}</span>
              <span className="pkg-card__unit">a month</span>
            </p>
            <p className="pkg-card__setup">+ {formatGBP(plan.setup)} setup</p>
            {!compact && <p className="pkg-card__summary">{plan.summary}</p>}
            <ul className="pkg-card__points" role="list">
              {(compact ? CARD_POINTS[id].slice(0, 4) : CARD_POINTS[id]).map((p) => (
                <li key={p}>{p}</li>
              ))}
              <li>Yours after {OWNERSHIP.ownershipAfterPayments} payments</li>
            </ul>
            <Link
              href={`/build?plan=${id}`}
              className={`btn ${plan.popular ? "btn--primary" : "btn--secondary"} pkg-card__cta`}
            >
              Build my quote
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

type Cell = string | boolean;
const tick = (v: Cell) =>
  v === true ? <span aria-label="Included">Included</span> : v === false ? <span className="muted" aria-label="Not included">–</span> : v;

const has = (id: WebsitePlanId, addOn: AddOnId) => (WEBSITE_PLANS[id].includedAddOns as AddOnId[]).includes(addOn);
const hours = (h: number) => (h === 0 ? "Technical changes only" : `${h} hour${h === 1 ? "" : "s"} a month`);

/** Everything each package includes, side by side. */
export function PackageComparison() {
  const rows: [string, (id: WebsitePlanId) => Cell][] = [
    ["Monthly price", (id) => formatGBP(WEBSITE_PLANS[id].monthly)],
    ["Setup fee", (id) => formatGBP(WEBSITE_PLANS[id].setup)],
    ["Pages included", (id) => `Up to ${WEBSITE_PLANS[id].pages}`],
    ["Extra pages", () => `${formatGBP(EXTRA_PAGE.monthly)} a month each`],
    ["Design", (id) => WEBSITE_PLANS[id].design],
    ["Managed hosting and SSL", () => true],
    ["Security updates and maintenance", () => true],
    ["Support", (id) => WEBSITE_PLANS[id].support],
    ["Content updates", (id) => hours(WEBSITE_PLANS[id].contentHours)],
    ["SEO", (id) => (id === "bronze" ? "Basic foundations" : id === "silver" ? "Enhanced foundations" : "Enhanced setup")],
    ["Google Analytics", (id) => id !== "bronze"],
    ["Image gallery", (id) => has(id, "gallery")],
    ["Testimonials section", (id) => has(id, "testimonials")],
    ["WhatsApp integration", (id) => has(id, "whatsapp")],
    ["Lead notification emails", (id) => has(id, "leadNotifications")],
    ["Blog", (id) => has(id, "blog")],
    ["Advanced enquiry forms", (id) => has(id, "advancedForms")],
    ["Booking integration", (id) => (has(id, "booking") ? "Included*" : false)],
    ["Advanced animations and conversion tracking", (id) => id === "gold"],
    [`Ownership after ${OWNERSHIP.ownershipAfterPayments} payments`, () => true],
  ];
  return (
    <div className="table-wrap" role="region" aria-label="Compare website packages" tabIndex={0}>
      <table className="table pkg-compare">
        <thead>
          <tr>
            <th scope="col">
              <span className="visually-hidden">Feature</span>
            </th>
            {PLAN_ORDER.map((id) => (
              <th key={id} scope="col" className={WEBSITE_PLANS[id].popular ? "pkg-compare__popular" : undefined}>
                {WEBSITE_PLANS[id].name}
                {WEBSITE_PLANS[id].popular && <span className="pkg-compare__tag">Most popular</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, cell]) => (
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
      </table>
      <p className="fine mt-4">*Booking integration is subject to agreed functionality and any third-party costs.</p>
    </div>
  );
}

/** Shown wherever ownership and term rules appear, until a legal review is confirmed. */
export function LegalDraftNotice() {
  if (!LEGAL_REVIEW_PENDING) return null;
  return (
    <p className="notice notice--compact">
      <span>
        <strong>Draft terms.</strong> The ownership, cancellation and transfer terms are awaiting legal review and
        will be confirmed in your written agreement.
      </span>
    </p>
  );
}

/** The 12-month ownership promise. */
export function OwnershipPromise() {
  return (
    <div className="ownership">
      <div className="ownership__head">
        <h3 className="ownership__title">Your website. Your business. Your ownership.</h3>
        <p className="ownership__lede">
          Your website should become a business asset, not something you rent forever. After{" "}
          {OWNERSHIP.ownershipAfterPayments} successful monthly payments, ownership of your agreed website deliverables
          transfers to you.
        </p>
      </div>
      <ol className="ownership__steps" role="list">
        <li>
          <span className="ownership__when">Months 1 to {OWNERSHIP.minimumTermMonths}</span>
          <span>
            The minimum term. Your subscription covers the build, hosting, maintenance and support in your package.
          </span>
        </li>
        <li>
          <span className="ownership__when">After payment {OWNERSHIP.ownershipAfterPayments}</span>
          <span>
            Ownership of the agreed website deliverables transfers to you. Your domain is registered in your name, and
            this is documented in your agreement.
          </span>
        </li>
        <li>
          <span className="ownership__when">After that</span>
          <span>
            Carry on month to month with hosting, maintenance and support, or ask us to transfer the website to you
            under the transfer policy, with {OWNERSHIP.noticeDays} days&apos; notice.
          </span>
        </li>
      </ol>
      <p className="fine">
        Third-party licences and subscriptions stay under their own terms. Our own reusable tools and frameworks are not
        transferred automatically.
      </p>
      <LegalDraftNotice />
    </div>
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
        <p className="pkg-card__setup">Paid up front · yours on full payment</p>
        <Link href="/build?type=oneOff" className="btn btn--secondary">
          Price my website
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

/** Every add-on with its monthly and one-off price, and which package already includes it. */
export function AddOnsTable() {
  const price = (n: number | null, from?: boolean, unit = "") =>
    n === null ? <span className="muted">–</span> : `${from ? "from " : ""}${formatGBP(n)}${unit}`;
  return (
    <div className="table-wrap" role="region" aria-label="Additional website features" tabIndex={0}>
      <table className="table table--stack">
        <thead>
          <tr>
            <th scope="col">Feature</th>
            <th scope="col">On a monthly package</th>
            <th scope="col">On a one-off website</th>
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
