import type { Metadata } from "next";
import Link from "next/link";
import { LegalDraftNotice } from "@/components/pricing/WebsitePackages";
import { SubscribeActions } from "@/components/SubscribeActions";
import { isHostingCode } from "@/lib/hosting-request";
import { formatPence } from "@/lib/pricing";
import { serviceClient } from "@/lib/quote-store";
import { OFFER_TOKEN_RE, firstPaymentPence, hashOfferToken } from "@/lib/website-subscriptions";
import { BLACK_FRIDAY, CANCEL_FREE, FIRST_BILL_DAY, OFFER_HEADLINE, blackFridayOf } from "@/lib/black-friday";
import { blackFridayActiveNow } from "@/lib/black-friday-clock";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your payment link", robots: { index: false, follow: false } };

type Row = {
  reference: string;
  kind: "subscription" | "one_off";
  package_code?: string;
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
  quote_snapshot?: Record<string, unknown> | null;
};

const gbp = (p: number) => formatPence(p);
const date = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" });

/** Loads the offer for a link, and whether an unpaid offer has expired. */
async function load(token: string): Promise<{ row: Row | null; expired: boolean }> {
  const db = serviceClient();
  if (!OFFER_TOKEN_RE.test(token) || !db) return { row: null, expired: false };
  const { data } = await db
    .from("website_subscriptions")
    .select("reference, kind, package_code, status, name, business_name, package_name, setup_pence, monthly_pence, one_off_pence, minimum_term_months, ownership_after_payments, payments_count, ownership_eligible_at, offer_expires_at, cancel_at_period_end, quote_snapshot")
    .eq("offer_token_hash", hashOfferToken(token))
    .maybeSingle();
  const row = data as Row | null;
  // A link staff withdrew reads the same as one that ran out: it no longer works, and we will send another.
  return { row, expired: Boolean(row && (row.status === "expired" || (row.status === "offered" && new Date(row.offer_expires_at).getTime() < Date.now()))) };
}

/** A customer's private link: the offer before payment, then their subscription and billing afterwards. */
export default async function SubscribePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ cancelled?: string }>;
}) {
  const { token } = await params;
  // Stripe's cancel link brings the customer back here: say plainly that nothing was taken.
  const cancelled = (await searchParams).cancelled === "1";
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
          <Offer row={row} token={token} cancelled={cancelled} />
        ) : (
          <Account row={row} token={token} />
        )}
      </div>
    </section>
  );
}

function Offer({ row, token, cancelled }: { row: Row; token: string; cancelled: boolean }) {
  const sub = row.kind === "subscription";
  const blackFriday = sub ? blackFridayOf(row.quote_snapshot) : null;
  if (blackFriday) return <BlackFridayOffer row={row} token={token} cancelled={cancelled} />;
  const first = firstPaymentPence({ kind: row.kind, setupPence: row.setup_pence, monthlyPence: row.monthly_pence, oneOffPence: row.one_off_pence });
  return (
    <div className="stack" style={{ "--stack": "var(--space-5)" } as React.CSSProperties}>
      {cancelled && (
        <p className="notice" role="status">
          You left the payment page, so nothing has been taken. You can pick up where you left off below.
        </p>
      )}
      <p className="eyebrow">{row.reference}</p>
      <h1 className="h1">
        {sub ? (isHostingCode(row.package_code ?? "") ? `Your ${row.package_name} plan.` : `Your ${row.package_name} website package.`) : `Your ${row.package_name}.`}
      </h1>
      <p className="lede">Hi {row.name.split(/\s+/)[0]}. Here&apos;s what you&apos;re agreeing to before you pay.</p>
      <div className="cfg-totals">
        {sub ? (
          <>
            <div className="cfg-total cfg-total--main">
              <span>Monthly subscription</span>
              <strong>{gbp(row.monthly_pence)}</strong>
              <small>a month, {row.minimum_term_months > 0 ? `${row.minimum_term_months}-month minimum term` : "rolling monthly, no minimum term"}</small>
            </div>
            <div className="cfg-total">
              <span>First payment today</span>
              <strong>{gbp(first)}</strong>
              <small>
                {row.setup_pence ? `setup ${gbp(row.setup_pence)} + ` : ""}
                {row.one_off_pence ? `one-off extras ${gbp(row.one_off_pence)} + ` : ""}first month
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
          {row.minimum_term_months > 0 ? (
            <li>The minimum term is {row.minimum_term_months} months. After that, it continues month to month.</li>
          ) : (
            <li>Your subscription is rolling monthly, with no minimum term.</li>
          )}
          {row.ownership_after_payments > 0 ? (
            <li>After {row.ownership_after_payments} successful monthly payments, ownership of your agreed website deliverables transfers to you.</li>
          ) : (
            <li>Your domain name and the content you give us stay yours. We keep ownership of our own code and framework.</li>
          )}
          <li>{isHostingCode(row.package_code ?? "") ? "Managed hosting and technical support in your plan are included while you subscribe." : "Hosting, maintenance and support in your package are included while you subscribe."}</li>
        </ul>
      )}
      <LegalDraftNotice />
      <SubscribeActions
        token={token}
        mode="pay"
        firstPayment={gbp(first)}
        commitment={sub && row.minimum_term_months > 0 ? `the ${row.minimum_term_months}-month minimum term` : undefined}
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
            <dd>{row.ownership_after_payments > 0 ? `${row.payments_count} of ${row.ownership_after_payments} towards ownership` : row.payments_count}</dd>
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

/**
 * An offer made on the Black Friday free trial: the cancel page when the customer leaves Stripe, and the way back in.
 * Once the offer has ended, by the server's clock, the link stops rather than charging without the trial.
 */
function BlackFridayOffer({ row, token, cancelled }: { row: Row; token: string; cancelled: boolean }) {
  const on = blackFridayActiveNow();
  return (
    <div className="stack" style={{ "--stack": "var(--space-5)" } as React.CSSProperties}>
      <p className="eyebrow">{row.reference}</p>
      <h1 className="h1">{cancelled ? "No card added yet." : `${OFFER_HEADLINE}: your ${row.package_name} plan.`}</h1>
      <p className="lede">
        {cancelled
          ? `Hi ${row.name.split(/\s+/)[0]}. You left the secure payment page, so no card was added and nothing has been charged.`
          : `Hi ${row.name.split(/\s+/)[0]}. Here\u2019s what you\u2019re agreeing to.`}
      </p>
      {on ? (
        <>
          <div className="cfg-totals">
            <div className="cfg-total cfg-total--main">
              <span>Today</span>
              <strong>{gbp(0)}</strong>
              <small>your card is added; nothing is charged for {BLACK_FRIDAY.trialDays} days</small>
            </div>
            <div className="cfg-total">
              <span>From day {FIRST_BILL_DAY}</span>
              <strong>{gbp(row.monthly_pence)}</strong>
              <small>a month, rolling monthly, no minimum term</small>
            </div>
          </div>
          <ul className="sub-facts" role="list">
            <li>Your first monthly payment is taken on day {FIRST_BILL_DAY}, then each month. We email you a reminder 3 days before.</li>
            <li>Changed your mind? {CANCEL_FREE.charAt(0).toUpperCase() + CANCEL_FREE.slice(1)}: sign in to your account and choose Request cancellation, or reply to any of our emails.</li>
            <li>During your trial, your website is shown on a private WINJO preview link. It goes on your own domain, and files are handed over, once billing has started.</li>
            <li>Your design is licensed to you while your plan is active.</li>
          </ul>
          <LegalDraftNotice />
          <SubscribeActions
            token={token}
            mode="pay"
            freeTrial
            commitment="the Black Friday offer terms"
          />
          <p className="fine">The offer is open to sign-ups until {BLACK_FRIDAY.endsLabel}.</p>
        </>
      ) : (
        <>
          <p>The Black Friday offer ended on {BLACK_FRIDAY.endsLabel}, so this link no longer works.</p>
          <p>
            <Link href="/pricing" className="btn btn--primary">See the plans</Link>
          </p>
        </>
      )}
    </div>
  );
}
