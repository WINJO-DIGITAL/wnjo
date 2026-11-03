import { CARE_PLANS, PACKAGES, formatGBP } from "@/lib/pricing";

/*
 * Four steps, no surprises: the same website at each step, from sticky notes to live.
 * Phones swipe through them; wider screens show all four in a row.
 * Everything inside the screens is an example.
 */

const STAGES = [
  { id: "enquire", title: "Enquire", line: "Tell us what you need." },
  { id: "scope", title: "Scope", line: "A fixed price, in writing." },
  { id: "build", title: "Build", line: "Designed and built with you." },
  { id: "launch", title: "Launch", line: "Live, handed over, supported." },
] as const;

function Screen({ stage }: { stage: (typeof STAGES)[number]["id"] }) {
  if (stage === "enquire")
    return (
      <div className="bs-notes">
        <span style={{ rotate: "-4deg" }}>Our site breaks on phones</span>
        <span style={{ rotate: "3deg" }}>Enquiries go nowhere</span>
        <span style={{ rotate: "-2deg" }}>Nobody finds us on Google</span>
      </div>
    );
  if (stage === "scope")
    return (
      <div className="ws-quote">
        <div className="ws-quote__head">
          <b>Quote</b>
          <span>Oak &amp; Ember</span>
        </div>
        <span className="ws-quote__row">
          Design &amp; build <b>{formatGBP(PACKAGES.essential.from)}</b>
        </span>
        <span className="ws-quote__row">
          Booking form <b>Included</b>
        </span>
        <span className="ws-quote__row">
          Hosting &amp; care <b>{formatGBP(CARE_PLANS.hosting.monthly)}/mo</b>
        </span>
        <span className="ws-quote__row ws-quote__total">
          Total <b>{formatGBP(PACKAGES.essential.from)}</b>
        </span>
        <span className="bs-price">Fixed price, in writing</span>
      </div>
    );
  return (
    <>
      {stage === "launch" && <div className="bs-live">You&apos;re live</div>}
      <div className="ws-url">{stage === "launch" ? "oakandember.co.uk" : "preview.oakandember.co.uk"}</div>
      <div className="ws-nav">
        <b>Oak &amp; Ember</b>
        <i className="ws-menu" />
      </div>
      <div className="ws-photo">{stage === "build" && <span className="ws-note">Warmer photo?</span>}</div>
      <b className="ws-title">Wood-fired, all day.</b>
      <span className="ws-btn">Book a table</span>
    </>
  );
}

export function WebStages() {
  return (
    <ol role="list" className="bs bs--web" tabIndex={0} aria-label="How a website project runs, step by step">
      {STAGES.map((s, i) => (
        <li key={s.id} className="bs__stage" data-stage={s.id}>
          <div className="bs__screen" aria-hidden="true">
            <div className="bs__inner">
              <Screen stage={s.id} />
            </div>
          </div>
          <span className="bs__num">{String(i + 1).padStart(2, "0")}</span>
          <h3>{s.title}</h3>
          <p>{s.line}</p>
        </li>
      ))}
    </ol>
  );
}
