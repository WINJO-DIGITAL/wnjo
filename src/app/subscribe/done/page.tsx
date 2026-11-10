import type { Metadata } from "next";
import Link from "next/link";
import { serviceClient } from "@/lib/quote-store";
import { stripeConfig } from "@/lib/stripe";
import { readCheckout } from "@/lib/website-subscriptions";
import { PaymentConfirmed, type ConfirmedOrder } from "@/components/PaymentConfirmed";
import { RefreshWhilePending } from "@/components/RefreshWhilePending";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Payment", robots: { index: false, follow: false } };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * After Stripe Checkout. Only says payment went through if Stripe confirms it for this session. The order's details
 * come from our own record of the offer the session was made for, never from the address.
 */
export default async function SubscribeDone({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const { session_id: sessionId } = await searchParams;
  const key = stripeConfig().secretKey;
  let confirmed = false;
  // Stripe has the session but isn't sure of the payment yet: say so calmly and check again, rather than show an error.
  let processing = false;
  let order: ConfirmedOrder | null = null;
  if (key && typeof sessionId === "string" && /^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId)) {
    try {
      const s = await readCheckout(key, sessionId);
      confirmed = s.status === "complete" && (s.paymentStatus === "paid" || s.paymentStatus === "no_payment_required");
      processing = !confirmed && s.status === "complete";
      if (confirmed && s.clientReferenceId && UUID.test(s.clientReferenceId)) {
        const db = serviceClient();
        const { data } = db
          ? await db
              .from("website_subscriptions")
              .select("reference, kind, package_name, email, setup_pence, monthly_pence, one_off_pence, minimum_term_months")
              .eq("id", s.clientReferenceId)
              .maybeSingle()
          : { data: null };
        order = (data as ConfirmedOrder | null) ?? null;
      }
    } catch {
      confirmed = false;
    }
  }

  return (
    <section className="section">
      <div className="container sub-page stack" style={{ "--stack": "var(--space-5)" } as React.CSSProperties}>
        {confirmed ? (
          <PaymentConfirmed order={order} />
        ) : processing ? (
          <>
            <RefreshWhilePending />
            <p className="eyebrow">Payment</p>
            <h1 className="h1">Your payment is being confirmed.</h1>
            <p className="lede">
              This is taking a little longer than usual. Nothing has gone wrong, and you don&apos;t need to do anything.
              We&apos;ll email you as soon as it&apos;s confirmed.
            </p>
            <p>
              <Link href="/" className="btn btn--secondary">Back to home</Link>
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
            <p>
              <Link href="/" className="btn btn--secondary">Back to home</Link>
            </p>
          </>
        )}
      </div>
    </section>
  );
}
