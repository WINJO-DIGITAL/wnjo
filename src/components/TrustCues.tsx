/**
 * Four plain facts beside the plans, each already true of the service and stated elsewhere on the site: the rolling
 * monthly term, where we are, the cookie policy and what every plan includes. No figures, ratings or claims.
 */
const CUES: { label: string; icon: React.ReactNode }[] = [
  {
    label: "No minimum term",
    icon: (
      <>
        <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
        <path d="M3.5 10h17M8 3v4M16 3v4M9 15l2 2 4-4" />
      </>
    ),
  },
  {
    label: "UK-based, in Lancashire",
    icon: (
      <>
        <path d="M12 21s7-6.2 7-11.5a7 7 0 1 0-14 0C5 14.8 12 21 12 21z" />
        <circle cx="12" cy="9.5" r="2.5" />
      </>
    ),
  },
  {
    label: "No tracking cookies",
    icon: (
      <>
        <path d="M12 3l7.5 3v5.5c0 4.6-3.1 8.3-7.5 9.5-4.4-1.2-7.5-4.9-7.5-9.5V6L12 3z" />
        <path d="M9 12l2.2 2.2L15.2 10" />
      </>
    ),
  },
  {
    label: "Hosting, updates and support included",
    icon: (
      <>
        <rect x="3.5" y="4" width="17" height="6.5" rx="2" />
        <rect x="3.5" y="13.5" width="17" height="6.5" rx="2" />
        <path d="M7 7.25h.01M7 16.75h.01" />
      </>
    ),
  },
];

export function TrustCues() {
  return (
    <ul role="list" className="trust-cues" aria-label="Included with every plan">
      {CUES.map((cue) => (
        <li key={cue.label}>
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {cue.icon}
          </svg>
          <span>{cue.label}</span>
        </li>
      ))}
    </ul>
  );
}
