import Link from "next/link";
import type { ReactNode } from "react";
import { PRICING_STATUS, VAT_NOTE } from "@/lib/pricing";
import { ArrowRight } from "./Icons";

export function PageHero({
  eyebrow,
  title,
  lede,
  children,
  compact = false,
  visual,
}: {
  eyebrow: string;
  title: ReactNode;
  lede?: ReactNode;
  children?: ReactNode;
  /** A tighter top section, for pages where the content below is what the visitor came for (pricing). */
  compact?: boolean;
  /** A picture or demo beside the text on laptops and up, and below it on phones. */
  visual?: ReactNode;
}) {
  const text = (
    <>
      <p className="eyebrow rise">{eyebrow}</p>
      <h1 className="h1 rise" style={{ "--i": 1, maxWidth: compact ? "26ch" : "20ch" } as React.CSSProperties}>
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
    </>
  );
  return (
    <section className={compact ? "page-hero page-hero--compact" : "page-hero"}>
      {visual ? (
        <div className="container container--wide page-hero__split">
          <div>{text}</div>
          <div className="page-hero__visual rise" style={{ "--i": 4 } as React.CSSProperties}>
            {visual}
          </div>
        </div>
      ) : (
        <div className="container container--wide">{text}</div>
      )}
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
          <strong>Provisional pricing.</strong> Indicative, with no VAT added, and confirmed in writing before you commit.{" "}
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

/**
 * The closing call to action. Dark by default; "light" sits on the page colour under a hairline, so pages don't all
 * end on the same dark block. An optional visual (logos, a figure) sits above the title.
 */
export function CtaBand({
  title,
  body,
  children,
  tone = "dark",
  visual,
}: {
  title: ReactNode;
  body?: ReactNode;
  children: ReactNode;
  tone?: "dark" | "light";
  visual?: ReactNode;
}) {
  return (
    <section className={tone === "dark" ? "section inverse" : "section section--ruled cta-band--light"}>
      <div className="container container--wide cta-band" data-reveal>
        {visual && <div className="cta-band__visual">{visual}</div>}
        <div className="stack">
          <h2 className="h1" style={{ maxWidth: "18ch" }}>
            {title}
          </h2>
          {body && <p className="lede">{body}</p>}
        </div>
        <div className="btn-row">{children}</div>
      </div>
    </section>
  );
}
