import Link from "next/link";
import type { ReactNode } from "react";
import { PRICING_STATUS, VAT_NOTE } from "@/lib/pricing";
import { ArrowRight } from "./Icons";

export function PageHero({
  eyebrow,
  title,
  lede,
  children,
}: {
  eyebrow: string;
  title: ReactNode;
  lede?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section className="page-hero">
      <div className="container container--wide">
        <p className="eyebrow rise">{eyebrow}</p>
        <h1 className="h1 rise" style={{ "--i": 1, maxWidth: "20ch" } as React.CSSProperties}>
          {title}
        </h1>
        {lede && (
          <p className="lede rise" style={{ "--i": 2 } as React.CSSProperties}>
            {lede}
          </p>
        )}
        {children && (
          <div className="rise" style={{ "--i": 3 } as React.CSSProperties}>
            {children}
          </div>
        )}
      </div>
    </section>
  );
}

export function SectionHead({
  eyebrow,
  title,
  children,
  split = false,
}: {
  eyebrow?: string;
  title: ReactNode;
  children?: ReactNode;
  split?: boolean;
}) {
  return (
    <div className={`section-head${split ? " section-head--split" : ""}`} data-reveal>
      <div className="stack">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2 className="h2">{title}</h2>
      </div>
      {children && <div className="muted">{children}</div>}
    </div>
  );
}

export function ArrowLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="arrow-link">
      {children}
      <ArrowRight />
    </Link>
  );
}

export function PricingNotice({ compact = false }: { compact?: boolean }) {
  if (PRICING_STATUS === "confirmed") return <p className="fine">{VAT_NOTE}</p>;
  // One quiet line for pages that only point to prices; the full wording sits beside them on /pricing.
  if (compact)
    return (
      <p className="notice notice--compact">
        <span>
          <strong>Provisional pricing.</strong> Indicative, excluding VAT, and confirmed in writing before you commit.{" "}
          <Link href="/pricing">Details</Link>
        </span>
      </p>
    );
  return (
    <p className="notice">
      <span>
        <strong>Provisional pricing.</strong> Figures are indicative while our pricing is finalised, and every
        project is confirmed in writing before you commit. {VAT_NOTE}
      </span>
    </p>
  );
}

export function CtaBand({
  title,
  body,
  children,
}: {
  title: ReactNode;
  body?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="section inverse">
      <div className="container container--wide cta-band" data-reveal>
        <div className="stack">
          <h2 className="h1" style={{ maxWidth: "18ch" }}>
            {title}
          </h2>
          {body && <p className="lede">{body}</p>}
          <p className="reply-note">We reply within one working day, Monday to Friday.</p>
        </div>
        <div className="btn-row">{children}</div>
      </div>
    </section>
  );
}
