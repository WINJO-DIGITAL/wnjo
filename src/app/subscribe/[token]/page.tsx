import type { Metadata } from "next";
import { LegalDraftNotice } from "@/components/pricing/WebsitePackages";
import { SubscribeActions } from "@/components/SubscribeActions";
import { formatGBP } from "@/lib/pricing";
import { serviceClient } from "@/lib/quote-store";
import { OFFER_TOKEN_RE, firstPaymentPence, hashOfferToken } from "@/lib/website-subscriptions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your payment link", robots: { index: false, follow: false } };

type Row = {
  reference: string;
  kind: "subscription" | "one_off";
  status: string;
  name: string;
  business_name: string | null;
  package_name: string;
  setup_pence: number;
  monthly_pence: number;
  one_off_pence: number;
  minimum_term_months: number;
  ownership_after_payments: number;
  payments_count: number;
  ownership_eligible_at: string | null;
  offer_expires_at: string;
  cancel_at_period_end: boolean;
};

const gbp = (p: number) => formatGBP(p / 100);
const date = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" });

/** Loads the offer for a link, and whether an unpaid offer has expired. */
async function load(token: string): Promise<{ row: Row | null; expired: boolean }> {
  const db = serviceClient();
  if (!OFFER_TOKEN_RE.test(token) || !db) return { row: null, expired: false };
  const { data } = await db
    .from("website_subscriptions")
    .select("reference, kind, status, name, business_name, package_name, setup_pence, monthly_pence, one_off_pence, minimum_term_months, ownership_after_payments, payments_count, ownership_eligible_at, offer_expires_at, cancel_at_period_end")
    .eq("offer_token_hash", hashOfferToken(token))
    .maybeSingle();
  const row = data as Row | null;
  return { row, expired: Boolean(row && row.status === "offered" && new Date(row.offer_expires_at).getTime() < Date.now()) };
}

/** A customer's private link: the offer before payment, then their subscription and billing afterwards. */
export default async function SubscribePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { row, expired } = await load(token);

  return (
    <section className="section">
      <div className="container sub-page">
        {!row ? (
          <>
            <p className="eyebrow">Payment link</p>
            <h1 className="h1">This link isn&apos;t valid.</h1>
            <p className="lede">Please check you copied the whole link from our email, or reply to it and we&apos;ll send a new one.</p>
          </>
        ) : expired ? (
          <>
            <p className="eyebrow">{row.reference}</p>
            <h1 className="h1">This link has expired.</h1>
            <p className="lede">Reply to our email and we&apos;ll send you a new one.</p>
          </>
        ) : row.status === "offered" ? (
          <Offer row={row} token={token} />
        ) : (
          <Account row={row} token={token} />
        )}
      </div>
    </section>
  );
}

function Offer({ row, token }: { row: Row; token: string }) {
  const sub = row.kind === "subscription";
  const first = firstPaymentPence({ kind: row.kind, setupPence: row.setup_pence, monthlyPence: row.monthly_pence, oneOffPence: row.one_off_pence });
  return (
    <div className="stack" style={{ "--stack": "var(--space-5)" } as React.CSSProperties}>
      <p className="eyebrow">{row.reference}</p>
      <h1 className="h1">
        {sub ? `Your ${row.package_name} website package.` : `Your ${row.package_name}.`}
      </h1>
      <p className="lede">Hi {row.name.split(/\s+/)[0]}. Here&apos;s what you&apos;re agreeing to before you pay.</p>
      <div className="cfg-totals">
        {sub ? (
          <>
            <div className="cfg-total cfg-total--main">
              <span>Monthly subscription</span>
              <strong>{gbp(row.monthly_pence)}</strong>
              <small>a month, {row.minimum_term_months}-month minimum term</small>
            </div>
            <div className="cfg-total">
              <span>First payment today</span>
              <strong>{gbp(first)}</strong>
              <small>
                setup {gbp(row.setup_pence)}
                {row.one_off_pence ? ` + one-off extras ${gbp(row.one_off_pence)}` : ""} + first month
              </small>
            </div>
          </>
        ) : (
          <div className="cfg-total cfg-total--main">
            <span>Amount due now</span>
            <strong>{gbp(row.one_off_pence)}</strong>
            <small>a single payment</small>
          </div>
        )}
      </div>
      {sub && (
        <ul className="sub-facts" role="list">
          <li>Your first payment is taken today. Then {gbp(row.monthly_pence)} is taken automatically each month.</li>
          <li>The minimum term is {row.minimum_term_months} months. After that, it continues month to month.</li>
          <li>After {row.ownership_after_payments} successful monthly payments, ownership of your agreed website deliverables transfers to you.</li>
          <li>Hosting, maintenance and support in your package are included while you subscribe.</li>
        </ul>
      )}
      <LegalDraftNotice />
      <SubscribeActions
        token={token}
        mode="pay"
        firstPayment={gbp(first)}
        commitment={sub ? `the ${row.minimum_term_months}-month minimum term` : undefined}
      />
    </div>
  );
}

function Account({ row, token }: { row: Row; token: string }) {
  const sub = row.kind === "subscription";
  const status: Record<string, string> = {
    active: row.cancel_at_period_end ? "Active, ending at the end of this period" : "Active",
    past_due: "Payment overdue: please update your card",
    cancelled: "Ended",
    paid: "Paid",
    expired: "Expired",
  };
  return (
    <div className="stack" style={{ "--stack": "var(--space-5)" } as React.CSSProperties}>
      <p className="eyebrow">{row.reference}</p>
      <h1 className="h1">{sub ? `Your ${row.package_name} package.` : `Your ${row.package_name}.`}</h1>
      <dl className="sub-facts sub-facts--dl">
        <div><dt>Status</dt><dd>{status[row.status] ?? row.status}</dd></div>
        {sub && <div><dt>Monthly</dt><dd>{gbp(row.monthly_pence)}</dd></div>}
        {sub && (
          <div>
            <dt>Payments made</dt>
            <dd>{row.payments_count} of {row.ownership_after_payments} towards ownership</dd>
          </div>
        )}
        {sub && row.ownership_eligible_at && (
          <div><dt>Ownership due since</dt><dd>{date.format(new Date(row.ownership_eligible_at))}</dd></div>
        )}
      </dl>
      {sub && row.status !== "cancelled" && <SubscribeActions token={token} mode="manage" />}
      <p className="fine">Questions about your package? Reply to any of our emails.</p>
    </div>
  );
}
