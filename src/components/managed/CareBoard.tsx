/**
 * What "looked after" means, drawn rather than described: the checks we run on a managed website, ticking through.
 * An illustration (the domain is an example), decorative for screen readers because the page text says the same.
 */
const CHECKS = [
  ["Hosting", "Online"],
  ["SSL certificate", "Valid"],
  ["Security", "Monitored"],
  ["Software", "Updated"],
  ["Uptime", "Watched"],
] as const;

export function CareBoard() {
  return (
    <div className="care" aria-hidden="true">
      <div className="care__bar">
        <span className="care__url">yourbusiness.co.uk</span>
        <span className="care__state">Looked after by Winjo</span>
      </div>
      <ul role="list" className="care__rows">
        {CHECKS.map(([name, state], i) => (
          <li key={name} style={{ "--i": i } as React.CSSProperties}>
            <span>{name}</span>
            <b>{state}</b>
          </li>
        ))}
      </ul>
      <p className="care__note">Example of a managed website</p>
    </div>
  );
}
