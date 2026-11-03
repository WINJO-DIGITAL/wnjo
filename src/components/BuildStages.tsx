/*
 * Scope first, then build: the same app screen at each of the five stages, from sticky
 * notes to live. Phones swipe through them; wider screens show all five in a row.
 * Everything inside the screens is an example.
 */

const STAGES = [
  { id: "discovery", title: "Discovery", line: "How you work today." },
  { id: "scope", title: "Scope", line: "A fixed price, in writing." },
  { id: "design", title: "Design", line: "Shaped with your team." },
  { id: "build", title: "Build", line: "Working, in stages." },
  { id: "launch", title: "Launch", line: "Live and supported." },
] as const;

const ROWS = [
  ["09:00", "Sarah Mitchell", "Booked"],
  ["13:30", "Tom Bennett", "On the way"],
  ["10:00", "Emma Clarke", "Quote sent"],
];

function Screen({ stage }: { stage: (typeof STAGES)[number]["id"] }) {
  if (stage === "discovery")
    return (
      <div className="bs-notes">
        <span style={{ rotate: "-4deg" }}>Jobs live in 3 spreadsheets</span>
        <span style={{ rotate: "3deg" }}>Double bookings</span>
        <span style={{ rotate: "-2deg" }}>Chasing payments by text</span>
      </div>
    );
  const real = stage === "build" || stage === "launch";
  return (
    <>
      {stage === "launch" && <div className="bs-live">You&apos;re live</div>}
      <div className="bs-head">
        {stage === "scope" ? <i className="bs-bar" style={{ width: "55%" }} /> : <b>Today&apos;s jobs</b>}
      </div>
      {ROWS.map(([time, who, status]) => (
        <div key={who} className="bs-row">
          {real ? (
            <>
              <span className="bs-time">{time}</span>
              <span className="bs-who">{who}</span>
              <span className="bs-chip">{status}</span>
            </>
          ) : (
            <>
              <i className="bs-bar" style={{ width: "18%" }} />
              <i className="bs-bar" style={{ width: "44%" }} />
              <i className="bs-bar bs-bar--chip" style={{ width: "22%" }} />
            </>
          )}
        </div>
      ))}
      {stage === "scope" ? (
        <span className="bs-price">Fixed price, in writing</span>
      ) : (
        <span className="bs-btn">{real ? "New job" : <i className="bs-bar" style={{ width: "40%" }} />}</span>
      )}
    </>
  );
}

export function BuildStages() {
  return (
    <ol role="list" className="bs" tabIndex={0} aria-label="How an app project runs, stage by stage">
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
