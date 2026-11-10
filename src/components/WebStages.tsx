import { WEBSITE_PLANS, formatGBP } from "@/lib/pricing";

/*
 * Four steps: the same website at each step, from sticky notes to live and looked after.
 * Phones swipe through them; wider screens show all four in a row.
 * Everything inside the screens is an example.
 */

const STAGES = [
  { id: "enquire", title: "Tell us", line: "Your business and what you need." },
  { id: "scope", title: "Proposal", line: "Your plan and price, in writing." },
  { id: "build", title: "Build", line: "Designed and built with you." },
  { id: "launch", title: "Launch", line: "Live, and looked after from then on." },
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
          <b>Proposal</b>
          <span>Your business</span>
        </div>
        <span className="ws-quote__row">
          {WEBSITE_PLANS.silver.name} package <b>{formatGBP(WEBSITE_PLANS.silver.monthly)}/mo</b>
        </span>
        <span className="ws-quote__row">
          Hosting and care <b>Included</b>
        </span>
        <span className="ws-quote__row">
          Minimum term <b>None</b>
        </span>
        <span className="ws-quote__row ws-quote__total">
          First payment <b>{formatGBP(WEBSITE_PLANS.silver.setup + WEBSITE_PLANS.silver.monthly)}</b>
        </span>
        <span className="bs-price">One monthly price, in writing</span>
      </div>
    );
  return (
    <>
      {stage === "launch" && <div className="bs-live">You&apos;re live</div>}
      <div className="ws-url">{stage === "launch" ? "yourbusiness.co.uk" : "preview.yourbusiness.co.uk"}</div>
      <div className="ws-nav">
        <b>Your business</b>
        <i className="ws-menu" />
      </div>
      <div className="ws-photo">{stage === "build" && <span className="ws-note">Warmer photo?</span>}</div>
      <b className="ws-title">Your headline here.</b>
      <span className="ws-btn">Book a table</span>
    </>
  );
}

export function WebStages() {
  return (
    <ol role="list" className="bs bs--web" tabIndex={0} aria-label="How getting started works, step by step">
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
