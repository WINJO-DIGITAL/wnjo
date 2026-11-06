"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { Stopwatch } from "@/components/Icons";
import { OWNER_QUOTES, type Project } from "@/lib/projects";

type Item = Pick<Project, "slug" | "name" | "mobile" | "tablet" | "logo">;
type Mode = "phone" | "tablet";

/** Stage colour and glow for each project (decoration only). */
const THEME: Record<string, { bg: string; glow: string }> = {
  "ev-exec": { bg: "#1b2233", glow: "#c9a24b" },
  boonma: { bg: "#4a3a4f", glow: "#b78fb8" },
  "raeng-fitness": { bg: "#262624", glow: "#d8d2c4" },
  "alex-k-bells": { bg: "#34353a", glow: "#8d93a3" },
};
const FALLBACK = { bg: "#2a2019", glow: "#a84a26" };

/** The stage is laid out at 410px tall; everything scales from there (see --u in the CSS). */
const BASE_H = 410;
/** Centre-to-centre spacing of the cards at that size. */
const SPACING: Record<Mode, number> = { phone: 150, tablet: 262 };
/** How long each project stays up before the carousel moves on by itself. */
const AUTO_MS = 6000;

const reducedQuery = "(prefers-reduced-motion: reduce)";
const subscribeReduced = (onChange: () => void) => {
  const mq = window.matchMedia(reducedQuery);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
};

/**
 * The phone hero's showcase: a swipeable coverflow of our work in a panel, with the Phone/Tablet
 * switch inside that panel, a rail of project pills, the price button and the owner's quote.
 * It moves on by itself every few seconds, pausing on hover, focus and while the panel is
 * off screen, and stopping for good once the visitor takes over. Reduced motion turns it off.
 * Only transform and opacity animate; dragging writes CSS variables and reads no layout.
 */
export function DeviceDeck({ items }: { items: Item[] }) {
  const [index, setIndex] = useState(0);
  const [mode, setMode] = useState<Mode>("phone");
  // Tablet screenshots are fetched once the visitor reaches for the switch (or the page is idle).
  const [tabletReady, setTabletReady] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [inView, setInView] = useState(true);
  // Once the visitor swipes, taps, uses the arrows, keys or pills, auto-advance stays off.
  const [stopped, setStopped] = useState(false);
  // The visitor's own pause, from the bar above the stage.
  const [paused, setPaused] = useState(false);
  const reduced = useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia(reducedQuery).matches,
    () => false,
  );

  const panelRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const pillRefs = useRef<(HTMLButtonElement | null)[]>([]);
  // Pixels per nominal pixel (stage height / 410), kept by a ResizeObserver.
  const unit = useRef(1);
  const gesture = useRef<{ x: number; moved: number; captured: boolean } | null>(null);
  // Set just after a drag, so the click that ends it doesn't also count as a tap.
  const justDragged = useRef(false);
  const nudge = useRef(0);
  const nudgeTimer = useRef(0);
  const placeRef = useRef<(drag: number) => void>(() => {});

  const last = items.length - 1;

  /** Place every card for the current index, plus a drag offset in nominal pixels. */
  const place = useCallback(
    (drag: number) => {
      const sp = SPACING[mode];
      cardRefs.current.forEach((el, k) => {
        if (!el) return;
        const o = k - index + drag / sp;
        const a = Math.abs(o);
        el.style.setProperty("--x", (o * sp).toFixed(1));
        el.style.setProperty("--s", (1 - Math.min(a, 1) * 0.17).toFixed(3));
        el.style.setProperty("--o", a > 1.6 ? "0" : (1 - Math.min(a, 1) * 0.42).toFixed(2));
        el.style.zIndex = String(10 - Math.round(a * 2));
      });
    },
    [index, mode],
  );

  // The nudge's frames call the latest `place`, never a stale one.
  useLayoutEffect(() => {
    placeRef.current = place;
    place(0);
  }, [place]);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      unit.current = entry.contentRect.height / BASE_H || 1;
      el.style.setProperty("--u", `${unit.current}px`);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.5 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => setTabletReady(true), 3500);
    return () => window.clearTimeout(t);
  }, []);

  const stopNudge = useCallback(() => {
    window.clearTimeout(nudgeTimer.current);
    if (nudge.current) cancelAnimationFrame(nudge.current);
    nudge.current = 0;
    stageRef.current?.classList.remove("is-dragging");
  }, []);

  // A gentle one-off nudge on arrival, so the swipe is discovered.
  useEffect(() => {
    if (reduced) return;
    nudgeTimer.current = window.setTimeout(() => {
      stageRef.current?.classList.add("is-dragging");
      let t = 0;
      const step = () => {
        t += 1;
        placeRef.current(-Math.sin(Math.min(t / 22, 1) * Math.PI) * 30);
        if (t < 22) nudge.current = requestAnimationFrame(step);
        else stopNudge();
      };
      nudge.current = requestAnimationFrame(step);
    }, 900);
    return stopNudge;
  }, [reduced, stopNudge]);

  const goTo = useCallback(
    (k: number, auto = false) => {
      stopNudge();
      if (!auto) setStopped(true);
      setIndex(k);
      const rail = railRef.current;
      const pill = pillRefs.current[k];
      if (rail && pill) rail.scrollTo({ left: pill.offsetLeft - 20, behavior: reduced ? "auto" : "smooth" });
    },
    [reduced, stopNudge],
  );

  /** Arrows and keys wrap round the ends. */
  const step = useCallback(
    (d: number) => goTo((index + d + items.length) % items.length),
    [goTo, index, items.length],
  );

  // Auto-advance: runs only while nothing holds it (see the header comment).
  const playing = !paused && !stopped;
  const autoOn = !reduced && playing && !hovered && !focused && !dragging && inView;
  const togglePlay = () => {
    if (playing) {
      setPaused(true);
    } else {
      setPaused(false);
      setStopped(false);
    }
  };
  useEffect(() => {
    if (!autoOn) return;
    const t = window.setTimeout(() => goTo((index + 1) % items.length, true), AUTO_MS);
    return () => window.clearTimeout(t);
  }, [autoOn, index, items.length, goTo]);

  const onPointerDown = (e: React.PointerEvent) => {
    stopNudge();
    gesture.current = { x: e.clientX, moved: 0, captured: false };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const g = gesture.current;
    if (!g) return;
    const dx = e.clientX - g.x;
    g.moved = Math.max(g.moved, Math.abs(dx));
    if (g.moved <= 6) return;
    if (!g.captured) {
      // Capture only once it's a drag, so a plain tap still reaches the card under the finger.
      e.currentTarget.setPointerCapture(e.pointerId);
      g.captured = true;
      stageRef.current?.classList.add("is-dragging");
      setDragging(true);
    }
    const edge = (index === 0 && dx > 0) || (index === last && dx < 0);
    place((edge ? dx * 0.3 : dx) / unit.current);
  };
  const onPointerEnd = (e: React.PointerEvent) => {
    const g = gesture.current;
    if (!g) return;
    gesture.current = null;
    stageRef.current?.classList.remove("is-dragging");
    setDragging(false);
    const dx = e.clientX - g.x;
    if (g.moved > 6) {
      justDragged.current = true;
      window.setTimeout(() => (justDragged.current = false), 300);
      setStopped(true);
    }
    const target = index + (dx < 0 ? 1 : -1);
    if (Math.abs(dx) > 45 && target >= 0 && target <= last) goTo(target);
    else place(0);
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      step(1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      step(-1);
    }
  };
  /** A tap on a neighbour brings it forward (not after a drag). */
  const tap = (k: number) => {
    if (k !== index && !justDragged.current) goTo(k);
  };

  const current = items[index];
  const theme = THEME[current.slug] ?? FALLBACK;
  const showTablet = tabletReady || mode === "tablet";

  return (
    <div className="deck" data-mode={mode}>
      <div ref={railRef} className="deck__rail" role="group" aria-label="Choose a project">
        {items.map((p, k) => (
          <button
            key={p.slug}
            ref={(el) => {
              pillRefs.current[k] = el;
            }}
            type="button"
            className="deck__pill"
            aria-pressed={k === index}
            onClick={() => goTo(k)}
          >
            <Image src={p.logo} alt="" width={36} height={36} sizes="36px" />
            <span>{p.name}</span>
          </button>
        ))}
      </div>

      <div
        ref={panelRef}
        className="deck__panel"
        style={{ "--bg": theme.bg, "--glow": `${theme.glow}66`, "--glow-0": `${theme.glow}00` } as React.CSSProperties}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setFocused(true)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false);
        }}
      >
        <div className="deck__bar">
          <span aria-hidden="true" />
          <div className="deck__switch" role="group" aria-label="Choose a device">
            <i aria-hidden="true" />
            <button
              type="button"
              aria-pressed={mode === "phone"}
              onClick={() => setMode("phone")}
              onPointerDown={() => setTabletReady(true)}
            >
              <svg width="12" height="14" viewBox="0 0 14 16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <rect x="2.5" y="1" width="9" height="14" rx="2.2" />
                <path d="M6 12.5h2" strokeLinecap="round" />
              </svg>
              Phone
            </button>
            <button
              type="button"
              aria-pressed={mode === "tablet"}
              onClick={() => setMode("tablet")}
              onPointerDown={() => setTabletReady(true)}
              onFocus={() => setTabletReady(true)}
            >
              <svg width="14" height="16" viewBox="0 0 16 18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <rect x="1.5" y="1" width="13" height="16" rx="2.4" />
                <path d="M6.5 14.5h3" strokeLinecap="round" />
              </svg>
              Tablet
            </button>
          </div>
          {!reduced && (
            <button
              type="button"
              className="deck__pause"
              onClick={togglePlay}
              aria-label={playing ? "Pause examples" : "Play examples"}
            >
              {playing ? (
                <svg width="12" height="14" viewBox="0 0 12 14" aria-hidden="true">
                  <path d="M1 1h3.2v12H1zM7.8 1H11v12H7.8z" fill="currentColor" />
                </svg>
              ) : (
                <svg width="12" height="14" viewBox="0 0 12 14" aria-hidden="true">
                  <path d="M1 1.2 11 7 1 12.8z" fill="currentColor" />
                </svg>
              )}
            </button>
          )}
        </div>

        <div
          ref={stageRef}
          className="deck__stage"
          tabIndex={0}
          role="group"
          aria-roledescription="carousel"
          aria-label="Recent work"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
          onKeyDown={onKeyDown}
        >
          {/* The scene fades out at both edges, so the neighbours read as a scroll, not a crop. */}
          <div className="deck__scene">
          <div className="deck__glow" aria-hidden="true" />
          <div className="deck__floor" aria-hidden="true" />
          {items.map((p, k) => (
            <div
              key={p.slug}
              ref={(el) => {
                cardRefs.current[k] = el;
              }}
              className="deck__card"
              aria-hidden={k !== index}
            >
              <div className="deck__dev deck__dev--phone" onClick={() => tap(k)}>
                <div className="deck__screen">
                  <Image
                    src={p.mobile}
                    alt={k === index ? `The ${p.name} website on a phone` : ""}
                    fill
                    sizes="176px"
                    preload={k === 0}
                    fetchPriority={k === 0 ? "high" : undefined}
                  />
                </div>
              </div>
              <div className="deck__dev deck__dev--tablet" onClick={() => tap(k)}>
                <div className="deck__screen">
                  {showTablet && (
                    <Image
                      src={p.tablet}
                      alt={k === index ? `The ${p.name} website on a tablet` : ""}
                      fill
                      sizes="300px"
                    />
                  )}
                </div>
              </div>
            </div>
          ))}
          </div>
          <span className="visually-hidden" aria-live="polite">
            {`${current.name}, ${index + 1} of ${items.length}`}
          </span>
        </div>

        {/* Prev / next sit in their own row under the stage, so they never cover a mockup. */}
        <div className="deck__nav">
          <button type="button" className="deck__arrow" aria-label="Previous example" onClick={() => step(-1)}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M10 3 5 8l5 5" />
            </svg>
          </button>
          <div className="deck__dots" aria-hidden="true">
            {items.map((p, k) => (
              <span key={p.slug} className={k === index ? "is-on" : undefined} />
            ))}
          </div>
          <button type="button" className="deck__arrow" aria-label="Next example" onClick={() => step(1)}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m6 3 5 5-5 5" />
            </svg>
          </button>
        </div>

      </div>

      <div className="deck__cta">
        <Link href="/build" className="deck__btn">
          <Stopwatch size={20} />
          <span>
            Price a site like <b>{current.name}</b>
          </span>
        </Link>
        <p>Free · No obligation · About 2 minutes</p>
      </div>

      {/* Every owner's words share one grid cell, so the space is reserved and they crossfade. */}
      <div className="deck__quotes">
        {OWNER_QUOTES.map(({ project, quote }) => (
          <figure
            key={project.slug}
            className="deck__quote"
            data-on={project.slug === current.slug}
            aria-hidden={project.slug !== current.slug}
          >
            <blockquote>
              <p>{`“${quote}”`}</p>
            </blockquote>
            <figcaption>
              <Image src={project.logo} alt="" width={28} height={28} sizes="28px" />
              Owner, {project.name}
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
