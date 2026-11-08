/**
 * The two ways to pay, drawn on the same month-by-month grid so the difference shows at a glance:
 * a subscription is twelve equal payments then month to month; a bespoke project is two larger
 * payments (50% to start, 50% before launch) with optional hosting and care after. Bar heights are an
 * illustration of the shape, not of real amounts, and the caption says so.
 */
const MONTHS = 15;

type Bar = { size: "lg" | "md" | "sm"; tone: "solid" | "soft" };

const subscription: (Bar | null)[] = Array.from({ length: MONTHS }, (_, m) =>
  m < 12 ? { size: "md", tone: "solid" } : { size: "md", tone: "soft" },
);

const bespoke: (Bar | null)[] = Array.from({ length: MONTHS }, (_, m) => {
  if (m === 0 || m === 2) return { size: "lg", tone: "solid" };
  if (m === 1) return null;
  return { size: "sm", tone: "soft" };
});

function Track({ bars, label }: { bars: (Bar | null)[]; label: string }) {
  return (
    <div className="paytl__track" role="img" aria-label={label}>
      {bars.map((bar, m) => (
        <span
          key={m}
          className={bar ? `paytl__bar paytl__bar--${bar.size} paytl__bar--${bar.tone}` : "paytl__bar paytl__bar--none"}
        />
      ))}
    </div>
  );
}

export function PaymentTimeline() {
  return (
    <figure className="paytl">
      <div className="paytl__row">
        <p className="paytl__name">Monthly subscription</p>
        <Track
          bars={subscription}
          label="Twelve equal monthly payments, then month to month on 30 days' notice."
        />
        <p className="paytl__note">
          Twelve equal payments cover the build, hosting, care and improvements. Then month to month.
        </p>
      </div>
      <div className="paytl__row">
        <p className="paytl__name">Bespoke project</p>
        <Track
          bars={bespoke}
          label="Half the build fee to start and half before launch, then optional monthly hosting and care."
        />
        <div className="paytl__axis" aria-hidden="true">
          <span>Month 1</span>
          <span>Month 12</span>
        </div>
        <p className="paytl__note">50% to start, 50% before launch. Hosting and care after that are optional.</p>
      </div>
      <figcaption className="paytl__caption">Illustration, not to scale. Your written quote sets the amounts.</figcaption>
    </figure>
  );
}
