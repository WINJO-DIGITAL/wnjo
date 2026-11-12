"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatPence } from "@/lib/pricing";

/** Which payment this is: a standard plan, the 50% deposit on a website bought outright, or its final balance. */
export type PaymentJourney = "plan" | "deposit" | "balance";

export type ConfirmedOrder = {
  enquiry_reference?: string | null;
  reference: string;
  kind: "subscription" | "one_off";
  package_name: string;
  email: string;
  setup_pence: number;
  monthly_pence: number;
  one_off_pence: number;
  minimum_term_months: number;
};

/**
 * What was paid today: setup, one-off extras and the first month, or the one-off amount. The same sum as the server's
 * firstPaymentPence, written here because that module uses Node's crypto and this page runs in the browser.
 */
const paidToday = (order: ConfirmedOrder) =>
  order.kind === "subscription" ? order.setup_pence + order.one_off_pence + order.monthly_pence : order.one_off_pence;

const day = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" });

/** "s***@example.com": enough to recognise, not enough to read out. */
export const maskEmail = (email: string) => {
  const [name, domain] = email.split("@");
  return domain ? `${name.charAt(0)}***@${domain}` : "your email address";
};

const NEXT_STEPS: Record<PaymentJourney, { title: string; body: string }[]> = {
  plan: [
    { title: "Tell us about your website", body: "Sign in to your account and share your goals, pages and style, if you haven't already. We start designing as soon as we have them." },
    { title: "Check your inbox", body: "Stripe emails a receipt, and we send a welcome message. Keep your confirmation number to hand." },
    { title: "Follow progress", body: "Sign in to your account with this email address at any time." },
  ],
  deposit: [
    { title: "We start building", body: "Your details are with us, so the build starts now. We'll update your account as it progresses." },
    { title: "Review and ask for changes", body: "When your website is ready, you'll see it in your account. You get two rounds of changes included." },
    { title: "Approve and pay the rest", body: "Once you're happy, approve the website in your account and pay the balance. We hand it over once it's paid." },
  ],
  balance: [
    { title: "We hand over your website", body: "We'll check everything one last time, then hand it over to you by email." },
    { title: "Keep your receipt", body: "Stripe emails a receipt for this payment. Keep your confirmation number to hand." },
  ],
};

/** How long the ring takes to fill and the tick to draw before the details appear. */
const REVEAL_AFTER_MS = 2000;

/**
 * What a customer sees once Stripe has confirmed their payment. A ring fills while the page says it is confirming, it
 * turns into a tick, and then the confirmation number, the order and what happens next fade in. People who prefer
 * reduced motion, and visitors without scripts, see the finished page straight away.
 */
export function PaymentConfirmed({ order, paidOn = new Date(), journey = "plan" }: { order: ConfirmedOrder | null; paidOn?: Date; journey?: PaymentJourney }) {
  const [done, setDone] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const reduce = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = setTimeout(() => setDone(true), reduce ? 0 : REVEAL_AFTER_MS);
    return () => clearTimeout(timer);
  }, []);

  const copy = async () => {
    if (!order) return;
    try {
      await navigator.clipboard.writeText(order.reference);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* The number is on screen; copying is a convenience. */
    }
  };

  return (
    <div className="pc" data-stage={done ? "done" : "confirming"}>
      <noscript>
        <style>{".pc__reveal{opacity:1!important;transform:none!important;visibility:visible!important}"}</style>
      </noscript>
      <div className="pc__head">
        <svg className="pc__badge" width="96" height="96" viewBox="0 0 96 96" fill="none" aria-hidden="true">
          <circle className="pc__ring-track" cx="48" cy="48" r="44" />
          <circle className="pc__ring" cx="48" cy="48" r="44" />
          <path className="pc__tick" d="M30 49.5 42.5 62 67 36" />
        </svg>
        <p className="pc__status" role="status" aria-live="polite">
          {done ? "Payment received" : "Confirming your payment…"}
        </p>
        <h1 className="pc__title pc__reveal">Thank you, your payment is in.</h1>
      </div>

      {order && (
        <section className="pc__card pc__reveal" aria-labelledby="pc-number-label">
          <div className="pc__number-row">
            <div>
              <p className="pc__label" id="pc-number-label">Confirmation number</p>
              <p className="pc__number">{order.reference}</p>
            </div>
            <button type="button" className="pc__copy" onClick={() => void copy()}>
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <dl className="pc__rows">
            <div>
              <dt>Package</dt>
              <dd>{order.package_name}</dd>
            </div>
            <div>
              <dt>Paid today</dt>
              <dd>{formatPence(paidToday(order))}</dd>
            </div>
            {order.kind === "subscription" && (
              <div>
                <dt>Then</dt>
                <dd>{formatPence(order.monthly_pence)} a month, {order.minimum_term_months > 0 ? `${order.minimum_term_months}-month minimum term` : "rolling monthly"}</dd>
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

      <section className="pc__next pc__reveal" aria-labelledby="pc-next-title">
        <h2 id="pc-next-title" className="pc__next-title">What happens next</h2>
        <ol className="pc__steps">
          {(NEXT_STEPS[journey] ?? NEXT_STEPS.plan).map((step) => (
            <li key={step.title}>
              <strong>{step.title}</strong>
              <p>{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <div className="pc__actions pc__reveal">
        <Link href="/account" className="btn btn--primary">Go to your account</Link>
        <Link href="/" className="pc__home">Back to home</Link>
      </div>
      <p className="fine pc__reveal">
        Questions? Reply to your receipt email or <Link href="/contact">contact us</Link>
        {order ? ` and quote ${order.reference}` : ""}.
      </p>
    </div>
  );
}
