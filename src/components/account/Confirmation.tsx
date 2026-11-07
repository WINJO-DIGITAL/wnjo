import Link from "next/link";

/**
 * The one confirmation style for anything a customer has just done: a quote accepted, a decision sent,
 * a deposit paid. A tick, a clear headline, one line of detail, and an optional reference and next step.
 * It takes focus when it appears so a screen reader announces it.
 */
export function Confirmation({
  title,
  detail,
  reference,
  nextStep,
  nextHref,
  nextLabel,
}: {
  title: string;
  detail?: string;
  reference?: string;
  nextStep?: string;
  nextHref?: string;
  nextLabel?: string;
}) {
  return (
    <div className="confirm" role="status" tabIndex={-1} ref={(el) => el?.focus()}>
      <p className="confirm__mark" aria-hidden="true">
        <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
          <path d="m4.5 10.5 3.5 3.5 7.5-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </p>
      <p className="confirm__title">{title}</p>
      {detail && <p className="confirm__detail">{detail}</p>}
      {reference && (
        <p className="confirm__ref">
          <span>Reference</span>
          <strong className="mono">{reference}</strong>
        </p>
      )}
      {nextStep && (
        <p className="confirm__next">
          <span>Next</span> {nextStep}
          {nextHref && nextLabel && (
            <>
              {" "}
              <Link href={nextHref}>{nextLabel}</Link>
            </>
          )}
        </p>
      )}
    </div>
  );
}
