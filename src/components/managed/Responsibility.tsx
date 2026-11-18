"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The whole proposition in one switch: everything a business owner has to sort out with an ordinary website, and
 * what is left once we look after it. Each chore is a real part of the managed service (see WEBSITE_PLANS); nothing
 * here promises more than the plans do.
 */
const CHORES = [
  "Find a designer",
  "Arrange hosting",
  "Renew the SSL certificate",
  "Keep it secure",
  "Watch for downtime",
  "Fix it when it breaks",
  "Find someone to make changes",
] as const;

/** One line drawing for each job on our list, in the same order as CHORES. */
const ICONS: React.ReactNode[] = [
  <path key="design" d="M5.5 4.5h13a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-11a2 2 0 0 1 2-2zM3.5 9.500h17M9 9.500v10" />,
  <path key="hosting" d="M5.5 4h13a2 2 0 0 1 2 2v2.500a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM5.5 13.500h13a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-2.500a2 2 0 0 1 2-2zM7 7.25h.01M7 16.75h.01" />,
  <path key="ssl" d="M7 11h10a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2zM8 11V8a4 4 0 0 1 8 0v3" />,
  <path key="secure" d="M12 3l7.5 3v5.500c0 4.6-3.1 8.3-7.5 9.5-4.4-1.2-7.5-4.9-7.5-9.500V6L12 3zM9 12l2.2 2.2 4-4.2" />,
  <path key="uptime" d="M3 12h4l2.5-6 4 12 2.5-6h5" />,
  <path key="fix" d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 8.500a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM5.7 5.700l3.8 3.800M14.5 14.500l3.8 3.800M18.3 5.700l-3.8 3.800M9.5 14.500l-3.8 3.8" />,
  <path key="changes" d="M12 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-6M17.5 3.500l3 3L12 15l-4 1 1-4 8.5-8.500z" />,
];

export function Responsibility() {
  const [ours, setOurs] = useState(true);
  // The points arrive one at a time. The first run waits until the switch is on screen; after that, every switch
  // between the two lists plays them again (see .resp__list li in globals.css).
  const root = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = root.current;
    if (!el || seen) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setSeen(true);
      },
      { threshold: 0.1 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [seen]);
  return (
    <div className="resp" ref={root} data-ours={ours} data-seen={seen || undefined}>
      <div className="resp__switch" role="group" aria-label="Who looks after the website">
        <button type="button" aria-pressed={!ours} onClick={() => setOurs(false)}>
          On your own
        </button>
        <button type="button" aria-pressed={ours} onClick={() => setOurs(true)}>
          With WINJO
        </button>
      </div>
      <div className="resp__board">
        <div className="resp__col">
          <p className="resp__label">Your list</p>
          <ul role="list" className="resp__list">
            {CHORES.map((chore, i) => (
              <li key={chore} style={{ "--i": i } as React.CSSProperties}>
                <span>{chore}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="resp__col resp__col--ours" aria-hidden={!ours}>
          <p className="resp__label">Our list</p>
          <ul role="list" className="resp__list">
            {CHORES.map((chore, i) => (
              <li key={chore} style={{ "--i": i } as React.CSSProperties}>
                <svg className="resp__icon" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  {ICONS[i]}
                </svg>
                <span>{chore.replace(/^Find a designer$/, "Design your website").replace(/^Find someone to make changes$/, "Make your changes")}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="visually-hidden" role="status">
        {ours
          ? "With WINJO: we design, host, secure, monitor, fix and change your website. You run your business."
          : "On your own: every one of these jobs is yours to organise."}
      </p>
    </div>
  );
}
