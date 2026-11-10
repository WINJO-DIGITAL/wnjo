"use client";

import Link from "next/link";
import { useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { OWNERSHIP, formatPence } from "@/lib/pricing";

/**
 * Pay for a bespoke build once its proposal has been accepted. The amount shown is worked out from the accepted
 * proposal exactly as the server will charge it; the server never takes the amount from this page. The customer
 * must agree to the terms first, then goes to Stripe.
 */
export function PayCard({
  client,
  briefId,
  payNow,
}: {
  client: SupabaseClient;
  briefId: string;
  payNow: { kind: "first_payment" | "deposit"; pence: number };
}) {
  const [agree, setAgree] = useState(false);
  const [startNow, setStartNow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const deposit = payNow.kind === "deposit";

  const pay = async () => {
    setBusy(true);
    setError(null);
    const { data } = await client.auth.getSession();
    const token = data.session?.access_token;
    const res = token
      ? await fetch("/api/briefs/pay", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ briefId, agree, startNow }),
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
      <p className="build-card__meta">{deposit ? "Your deposit" : "Your first payment"}</p>
      <p className="build-offer__total">
        <strong>{formatPence(payNow.pence)}</strong>
      </p>
      <p>
        {deposit
          ? "Your proposal is accepted. Pay your 50% deposit to start your website."
          : OWNERSHIP.minimumTermMonths > 0
            ? `Your proposal is accepted. Your first payment covers your setup and first month; the ${OWNERSHIP.minimumTermMonths}-month minimum term applies.`
            : "Your proposal is accepted. Your first payment starts your subscription, which is rolling monthly with no minimum term."}
      </p>
      <label className="sub-agree">
        <input type="checkbox" checked={startNow} onChange={(e) => setStartNow(e.target.checked)} />
        <span>Please start work straight away. I understand that if I cancel within 14 days, I pay for the work already done.</span>
      </label>
      <label className="sub-agree">
        <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
        <span>
          I agree to the{" "}
          <Link href="/terms" target="_blank">
            terms
          </Link>
          {deposit || OWNERSHIP.minimumTermMonths <= 0 ? "" : ` and the ${OWNERSHIP.minimumTermMonths}-month minimum term`}.
        </span>
      </label>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
      <div className="btn-row">
        <button type="button" className="btn btn--primary" disabled={!agree || busy} onClick={() => void pay()}>
          {busy ? "Opening secure payment…" : `Pay ${formatPence(payNow.pence)} securely`}
        </button>
      </div>
      <p className="fine">Payment is handled by Stripe. Your card details never reach our servers.</p>
    </div>
  );
}
