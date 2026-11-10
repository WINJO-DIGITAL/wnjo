import Link from "next/link";
import { formatPence } from "@/lib/pricing";
import { firstPaymentPence } from "@/lib/website-subscriptions";

export type ConfirmedOrder = {
  reference: string;
  kind: "subscription" | "one_off";
  package_name: string;
  email: string;
  setup_pence: number;
  monthly_pence: number;
  one_off_pence: number;
  minimum_term_months: number;
};

const day = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" });

/** "s***@example.com": enough to recognise, not enough to read out. */
export const maskEmail = (email: string) => {
  const [name, domain] = email.split("@");
  return domain ? `${name.charAt(0)}***@${domain}` : "your email address";
};

/** What a customer sees once Stripe has confirmed their payment: a confirmation number, the order, and what happens next. */
export function PaymentConfirmed({ order, paidOn = new Date() }: { order: ConfirmedOrder | null; paidOn?: Date }) {
  return (
    <>
            <p className="eyebrow">Payment received</p>
            <h1 className="h1">Thank you. You&apos;re all set.</h1>
            {order && (
              <section className="order-confirm" aria-labelledby="confirm-title">
                <p className="order-confirm__label" id="confirm-title">Confirmation number</p>
                <p className="order-confirm__number">{order.reference}</p>
                <dl className="order-confirm__rows">
                  <div>
                    <dt>Package</dt>
                    <dd>{order.package_name}</dd>
                  </div>
                  <div>
                    <dt>Paid today</dt>
                    <dd>{formatPence(firstPaymentPence({ kind: order.kind, setupPence: order.setup_pence, monthlyPence: order.monthly_pence, oneOffPence: order.one_off_pence }))}</dd>
                  </div>
                  {order.kind === "subscription" && (
                    <div>
                      <dt>Then</dt>
                      <dd>{formatPence(order.monthly_pence)} a month, {order.minimum_term_months}-month minimum term</dd>
                    </div>
                  )}
                  <div>
                    <dt>Date</dt>
                    <dd>{day.format(paidOn)}</dd>
                  </div>
                  <div>
                    <dt>Receipt sent to</dt>
                    <dd>{maskEmail(order.email)}</dd>
                  </div>
                </dl>
              </section>
            )}
            <section className="order-next" aria-labelledby="next-title">
              <h2 id="next-title" className="order-next__title">What happens next</h2>
              <ol>
                <li>Stripe emails you a receipt. Keep your confirmation number to hand.</li>
                <li>We&apos;ll be in touch within one working day to start your website.</li>
                <li>You can follow progress any time by signing in to your account with this email address.</li>
              </ol>
            </section>
            <div className="btn-row">
              <Link href="/account" className="btn btn--primary">Go to your account</Link>
              <Link href="/" className="btn btn--secondary">Back to home</Link>
            </div>
            <p className="fine">
              Questions? Reply to your receipt email or <Link href="/contact">contact us</Link>
              {order ? ` and quote ${order.reference}` : ""}.
            </p>
    </>
  );
}
