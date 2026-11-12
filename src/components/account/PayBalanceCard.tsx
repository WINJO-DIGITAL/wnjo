"use client";

import { useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { formatPence } from "@/lib/pricing";

/**
 * The final payment on a website bought outright, shown once the customer has approved it. The amount shown is worked
 * out from the accepted proposal exactly as the server charges it; the server never takes the amount from this page.
 * The terms were agreed when they paid the deposit, so this goes straight to Stripe.
 */
export function PayBalanceCard({ client, briefId, pence }: { client: SupabaseClient; briefId: string; pence: number }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pay = async () => {
    setBusy(true);
    setError(null);
    const { data } = await client.auth.getSession();
    const token = data.session?.access_token;
    const res = token
      ? await fetch("/api/briefs/balance", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ briefId }),
        }).catch(() => null)
      : null;
    const json = (await res?.json().catch(() => null)) as { url?: string; error?: string } | null;
    if (res?.ok && json?.url) {
      window.location.assign(json.url);
      return;
    }
    setBusy(false);
    setError(
      json?.error === "not_configured"
        ? "Online payment isn't switched on yet. Please reply to our email and we'll help."
        : json?.error && !["not_found", "stripe_failed", "rate_limited", "invalid"].includes(json.error)
          ? json.error
          : "We couldn't open the payment page. Please try again, or reply to our email.",
    );
  };

  return (
    <div className="build-offer build-pay">
      <p className="build-card__meta">Your final payment</p>
      <p className="build-offer__total">
        <strong>{formatPence(pence)}</strong>
      </p>
      <p>You&apos;ve approved your website. Pay the rest of the price and we&apos;ll hand it over to you.</p>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
      <div className="btn-row">
        <button type="button" className="btn btn--primary" disabled={busy} onClick={() => void pay()}>
          {busy ? "Opening secure payment…" : `Pay ${formatPence(pence)} securely`}
        </button>
      </div>
      <p className="fine">Payment is handled by Stripe. Your card details never reach our servers.</p>
    </div>
  );
}
