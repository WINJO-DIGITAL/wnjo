"use client";

import { useEffect, useRef, useState } from "react";
import { REFRESH } from "@/lib/pricing";

/**
 * Winjo Refresh, shown rather than explained: one example business, and the same website at launch and after each
 * planned refresh. Pick a point on the timeline (or swipe the screen) and the design moves on while the business
 * stays recognisably itself. The site is an illustration drawn in CSS; it claims nothing about a real client.
 */
const ERAS = [
  { id: "launch", when: "Launch", label: "Designed for your business" },
  { id: "first", when: `Month ${REFRESH.everyMonths}`, label: "First refresh, included" },
  { id: "second", when: `Month ${REFRESH.everyMonths * 2}`, label: "Second refresh, included" },
] as const;

export function RefreshTimeline() {
  const [era, setEra] = useState(0);
  const [touched, setTouched] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const startX = useRef<number | null>(null);

  // Plays through once when it first scrolls into view, unless the visitor prefers less motion or has taken over.
  useEffect(() => {
    const el = root.current;
    if (!el || touched) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let timers: number[] = [];
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        timers = [window.setTimeout(() => setEra(1), 1400), window.setTimeout(() => setEra(2), 3200)];
      },
      { threshold: 0.6 },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [touched]);

  const pick = (i: number) => {
    setTouched(true);
    setEra(Math.max(0, Math.min(ERAS.length - 1, i)));
  };

  return (
    <div className="rf" ref={root} data-era={ERAS[era].id}>
      <div
        className="rf__stage"
        onPointerDown={(e) => {
          startX.current = e.clientX;
        }}
        onPointerUp={(e) => {
          if (startX.current === null) return;
          const dx = e.clientX - startX.current;
          startX.current = null;
          if (Math.abs(dx) > 40) pick(era + (dx < 0 ? 1 : -1));
        }}
      >
        <p className="fine">Example business, for illustration.</p>
        <div className="rf__browser" aria-hidden="true">
          <div className="rf__chrome">
            <i />
            <i />
            <i />
            <span>harbourkitchen.co.uk</span>
          </div>
          <div className="rf__site">
            <div className="rf__nav">
              <b>Harbour Kitchen</b>
              <span>Menu</span>
              <span>Book</span>
            </div>
            <div className="rf__hero">
              <div className="rf__copy">
                <strong>Seafood, straight off the boat.</strong>
                <em>Open Wednesday to Sunday</em>
                <span className="rf__btn">Book a table</span>
              </div>
              <div className="rf__photo" />
            </div>
            <div className="rf__cards">
              <i />
              <i />
              <i />
            </div>
          </div>
        </div>
      </div>
      <div className="rf__timeline" role="group" aria-label="The same website over time">
        {ERAS.map((e, i) => (
          <button key={e.id} type="button" aria-pressed={era === i} onClick={() => pick(i)}>
            <span className="rf__when">{e.when}</span>
            <span className="rf__what">{e.label}</span>
          </button>
        ))}
      </div>
      <p className="rf__caption">An illustration. Your refresh is designed around your own business and brand.</p>
      <p className="visually-hidden" role="status">
        {ERAS[era].when}: {ERAS[era].label}.
      </p>
    </div>
  );
}
