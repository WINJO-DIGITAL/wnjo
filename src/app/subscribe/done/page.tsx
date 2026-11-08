import type { Metadata } from "next";
import Link from "next/link";
import { stripeConfig } from "@/lib/stripe";
import { readCheckout } from "@/lib/website-subscriptions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Payment", robots: { index: false, follow: false } };

/** After Stripe Checkout. Only says payment went through if Stripe confirms it for this session. */
export default async function SubscribeDone({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const { session_id: sessionId } = await searchParams;
  const key = stripeConfig().secretKey;
  let confirmed = false;
  if (key && typeof sessionId === "string" && /^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId)) {
    try {
      const s = await readCheckout(key, sessionId);
      confirmed = s.status === "complete" && (s.paymentStatus === "paid" || s.paymentStatus === "no_payment_required");
    } catch {
      confirmed = false;
    }
  }
  return (
    <section className="section">
      <div className="container sub-page stack" style={{ "--stack": "var(--space-5)" } as React.CSSProperties}>
        {confirmed ? (
          <>
            <p className="eyebrow">Payment received</p>
            <h1 className="h1">Thank you. You&apos;re all set.</h1>
            <p className="lede">
              Stripe has confirmed your payment and will email you a receipt. We&apos;ll be in touch within one working
              day to start your website.
            </p>
          </>
        ) : (
          <>
            <p className="eyebrow">Payment</p>
            <h1 className="h1">We haven&apos;t received a payment yet.</h1>
            <p className="lede">
              If you completed the payment, it can take a moment to confirm, and we&apos;ll email you as soon as it does.
              If not, you can use your payment link again.
            </p>
          </>
        )}
        <p>
          <Link href="/" className="btn btn--secondary">Back to home</Link>
        </p>
      </div>
    </section>
  );
}
