"use client";

import Link from "next/link";
import { useState } from "react";
import { OFFER_COOLING_OFF } from "@/lib/black-friday";

/** The agree-and-pay step, and the billing link for a subscriber. Errors are shown in plain words; nothing is faked. */
export function SubscribeActions({
  token,
  mode,
  firstPayment,
  commitment,
  freeTrial = false,
}: {
  token: string;
  mode: "pay" | "manage";
  firstPayment?: string;
  commitment?: string;
  /** The Black Friday free trial: the card is taken now and nothing is charged today. */
  freeTrial?: boolean;
}) {
  const [agree, setAgree] = useState(false);
  const [startNow, setStartNow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const go = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(mode === "pay" ? "/api/subscriptions/checkout" : "/api/subscriptions/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, agree, startNow }),
      });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (res.ok && data.url) {
        window.location.assign(data.url);
        return;
      }
      setError(
        data.error === "offer_ended"
          ? "The Black Friday offer has ended, so this link no longer works. Reply to our email and we'll help you choose a plan."
          : data.error === "expired"
          ? "This link has expired. Reply to our email and we'll send a new one."
          : data.error === "already_paid"
            ? "This has already been paid. Thank you."
            : data.error === "not_configured"
              ? "Online payment isn't switched on yet. Please reply to our email and we'll help."
              : "Something went wrong. Please try again, or reply to our email.",
      );
    } catch {
      setError("We couldn't reach the server. Check your connection and try again.");
    }
    setBusy(false);
  };

  if (mode === "manage") {
    return (
      <div className="stack" style={{ "--stack": "var(--space-3)" } as React.CSSProperties}>
        <button type="button" className="btn btn--secondary" onClick={go} disabled={busy}>
          {busy ? "Opening…" : "Update card or see invoices"}
        </button>
        {error && <p className="field-error" role="alert">{error}</p>}
      </div>
    );
  }

  return (
    <div className="stack" style={{ "--stack": "var(--space-4)" } as React.CSSProperties}>
      <label className="sub-agree">
        <input type="checkbox" checked={startNow} onChange={(e) => setStartNow(e.target.checked)} />
        <span>{freeTrial ? OFFER_COOLING_OFF : "Please start work straight away. I understand that if I cancel within 14 days, I pay for the work already done."}</span>
      </label>
      <label className="sub-agree">
        <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
        <span>
          I agree to the <Link href="/terms" target="_blank">terms</Link>
          {commitment ? ` and ${commitment}` : ""}.
        </span>
      </label>
      <button type="button" className="btn btn--primary" onClick={go} disabled={!agree || busy}>
        {busy ? "Opening secure payment…" : freeTrial ? "Add your card and start your free trial" : `Pay ${firstPayment ?? ""} securely`}
      </button>
      <p className="fine">Payment is handled by Stripe. Your card details never reach our servers.</p>
      {error && <p className="field-error" role="alert">{error}</p>}
    </div>
  );
}
