"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BriefWizard, type WizardApi } from "@/components/account/BriefWizard";
import { EMPTY_BRIEF } from "@/lib/website-brief";
import styles from "./Configurator.module.css";

const TEMPLATE_SITES_ON = process.env.NEXT_PUBLIC_TEMPLATE_SITES === "on";

/**
 * The six questions, straight after the short "Own your website" form, on the same screen. The customer holds a brief
 * pass for this one brief (see lib/brief-pass.ts): it lets them save progress and send the answers once, and nothing
 * else. It reads nothing back, so the wizard starts empty here, and files can be added but not opened until they sign in.
 */
export function ProjectBrief({ briefId, pass, reference, name, businessName, email, phone }: { briefId: string; pass: string; reference: string; name: string; businessName: string; email: string; phone: string }) {
  const [sent, setSent] = useState(false);

  const api = useMemo<WizardApi>(() => {
    const post = async (path: string, body: Record<string, unknown>) => {
      const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ briefId, pass, ...body }) }).catch(() => null);
      return { ok: Boolean(res?.ok), json: ((await res?.json().catch(() => null)) ?? null) as Record<string, unknown> | null };
    };
    return {
      loadAllowance: async () => null,
      loadProgress: async () => null,
      loadKnown: async () => ({ email, phone }),
      saveProgress: async (progress) => (await post("/api/briefs/progress", { action: "save", progress })).ok,
      viewFile: async () => null,
      send: async ({ name: n, businessName: b, brief, draftId }) => {
        const r = await post("/api/briefs/details", { name: n, businessName: b, brief, draftId });
        return r.ok ? { ok: true } : { ok: false, error: typeof r.json?.error === "string" ? r.json.error : "We couldn't save that just now. Please try again." };
      },
    };
  }, [briefId, pass, email, phone]);

  if (sent) {
    return (
      <div className="pc" data-stage="done">
        <div className="pc__head">
          <svg className="pc__badge" width="96" height="96" viewBox="0 0 96 96" fill="none" aria-hidden="true">
            <circle className="pc__ring-track" cx="48" cy="48" r="44" />
            <circle className="pc__ring" cx="48" cy="48" r="44" />
            <path className="pc__tick" d="M30 49.5 42.5 62 67 36" />
          </svg>
          <p className="pc__status" role="status" aria-live="polite">Answers received</p>
          <h1 className="pc__title" tabIndex={-1} ref={(el) => el?.focus()}>Thank you, {name.trim().split(/\s+/)[0]}.</h1>
        </div>
        <section className="pc__card pc__reveal" aria-labelledby="brief-number-label">
          <div className="pc__number-row">
            <div>
              <p className="pc__label" id="brief-number-label">Reference</p>
              <p className="pc__number">{reference}</p>
            </div>
          </div>
        </section>
        <section className="pc__next pc__reveal" aria-labelledby="brief-next-title">
          <h2 id="brief-next-title" className="pc__next-title">What happens next</h2>
          <ol className="pc__steps">
            <li>
              <strong>We write your proposal</strong>
              <p>We read your answers and put together a fixed-price proposal. We&apos;ll email it to {email}.</p>
            </li>
            <li>
              <strong>Sign in to read it</strong>
              <p>Sign in with this email address to read the proposal. Nothing is charged until you&apos;ve accepted it.</p>
            </li>
            <li>
              <strong>Pay 50% and we build</strong>
              <p>When you accept, you pay a 50% deposit and we start. You approve the website, then pay the rest.</p>
            </li>
          </ol>
        </section>
        <div className="pc__actions pc__reveal">
          <Link href="/account" className="btn btn--primary">Go to your account</Link>
          <Link href="/work" className="pc__home">See our work</Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.done}>
      <div className="stack" style={{ "--stack": "var(--space-5)" } as React.CSSProperties}>
        <div>
          <p className="eyebrow">Your website</p>
          <h2 className="h2">Now tell us about your website</h2>
          <p className="muted">A few quick questions, and then we&apos;ll write your proposal. Nothing to pay yet, and you can stop and come back from the link in your email.</p>
        </div>
        <BriefWizard initial={EMPTY_BRIEF} name={name} businessName={businessName} typesOn={TEMPLATE_SITES_ON} api={api} onSent={() => setSent(true)} bespoke />
      </div>
    </div>
  );
}
