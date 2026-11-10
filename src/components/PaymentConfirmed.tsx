"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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

/** How long the ring takes to fill and the tick to draw before the details appear. */
const REVEAL_AFTER_MS = 2000;

/**
 * What a customer sees once Stripe has confirmed their payment. A ring fills while the page says it is confirming, it
 * turns into a tick, and then the confirmation number, the order and what happens next fade in. People who prefer
 * reduced motion, and visitors without scripts, see the finished page straight away.
 */
export function PaymentConfirmed({ order, paidOn = new Date() }: { order: ConfirmedOrder | null; paidOn?: Date }) {
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
        <h1 className="pc__title pc__reveal">Thank you. You&apos;re all set.</h1>
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
              <dd>{formatPence(firstPaymentPence({ kind: order.kind, setupPence: order.setup_pence, monthlyPence: order.monthly_pence, oneOffPence: order.one_off_pence }))}</dd>
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
          <li>
            <span aria-hidden="true">1</span>
            <p>Stripe emails you a receipt. Keep your confirmation number to hand.</p>
          </li>
          <li>
            <span aria-hidden="true">2</span>
            <p>We&apos;ll be in touch within one working day to start your website.</p>
          </li>
          <li>
            <span aria-hidden="true">3</span>
            <p>Follow progress any time by signing in to your account with this email address.</p>
          </li>
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
