"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import type { Project } from "@/lib/projects";

type Item = Pick<Project, "slug" | "name" | "mobile" | "tablet" | "logo">;
type Mode = "phone" | "tablet";

/** Stage colour and glow for each project (decoration only). */
/* Light panels in a soft tint of each project's own colour, so the hero stays on-brand (cream) rather than a dark block. */
const THEME: Record<string, { bg: string; glow: string }> = {
  "ev-exec": { bg: "#e6e3dc", glow: "#c9a24b" },
  boonma: { bg: "#ece2e7", glow: "#b78fb8" },
  "raeng-fitness": { bg: "#e8e4dd", glow: "#9c958a" },
};
const FALLBACK = { bg: "#ebe3d7", glow: "#a84a26" };

/** The stage is laid out at 410px tall; everything scales from there (see --u in the CSS). */
const BASE_H = 410;
/** Centre-to-centre spacing of the cards at that size. */
const SPACING: Record<Mode, number> = { phone: 126, tablet: 262 };
/** How long each project stays up before the carousel moves on by itself. */
const AUTO_MS = 6000;

const reducedQuery = "(prefers-reduced-motion: reduce)";
const subscribeReduced = (onChange: () => void) => {
  const mq = window.matchMedia(reducedQuery);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
};

/**
 * The phone hero's showcase, kept deliberately quiet: a rail of project pills, a swipeable
 * coverflow of our work on phones, and the price button. No device switch or arrow row: the pills,
 * a swipe or the arrow keys move between projects.
 * It moves on by itself every few seconds, pausing on hover, focus and while the panel is
 * off screen, and stopping for good once the visitor takes over. Reduced motion turns it off.
 * Only transform and opacity animate; dragging writes CSS variables and reads no layout.
 */
export function DeviceDeck({ items }: { items: Item[] }) {
  const [index, setIndex] = useState(0);
  const mode: Mode = "phone";
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [inView, setInView] = useState(true);
  // Once the visitor swipes, taps, uses the arrows, keys or pills, auto-advance stays off.
  const [stopped, setStopped] = useState(false);
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


  /** Place every card for the current index, plus a drag offset in nominal pixels. */
  const place = useCallback(
    (drag: number) => {
      const sp = SPACING[mode];
      cardRefs.current.forEach((el, k) => {
        if (!el) return;
        // Looped: the nearest way round, so the next and previous clients always sit either side.
        const n = items.length;
        let base = (((k - index) % n) + n) % n;
        if (base > n / 2) base -= n;
        const o = base + drag / sp;
        const a = Math.abs(o);
        el.style.setProperty("--x", (o * sp).toFixed(1));
        el.style.setProperty("--s", (1 - Math.min(a, 1) * 0.17).toFixed(3));
        el.style.setProperty("--o", a > 1.6 ? "0" : (1 - Math.min(a, 1) * 0.42).toFixed(2));
        el.style.zIndex = String(10 - Math.round(a * 2));
      });
    },
    [index, mode, items.length],
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
  const autoOn = !reduced && !stopped && !hovered && !focused && !dragging && inView;
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
    place(dx / unit.current);
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
    // Looped: swiping past the last client brings the first round, and back again.
    const target = (index + (dx < 0 ? 1 : -1) + items.length) % items.length;
    if (Math.abs(dx) > 45) goTo(target);
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

  return (
    <div className="deck" data-mode={mode}>
      <div
        ref={panelRef}
        className="deck__panel"
        style={{ "--bg": theme.bg, "--glow": `${theme.glow}40`, "--glow-0": `${theme.glow}00` } as React.CSSProperties}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setFocused(true)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false);
        }}
      >
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
            </div>
          ))}
          </div>
          <span className="visually-hidden" aria-live="polite">
            {`${current.name}, ${index + 1} of ${items.length}`}
          </span>
        </div>

      </div>

      {/* The project pills sit under the device, so the headline and the phone lead. */}
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

      <div className="deck__cta">
        <Link href="/build?plan=bronze" className="deck__btn">
          <span className="deck__btn-main">Get your website</span>
          <span className="deck__btn-price">
            From £99/month <span className="deck__btn-term">· No minimum term</span>
          </span>
          <span className="deck__btn-ticks">
            <span>No long-term contracts</span>
            <span>Ongoing support</span>
          </span>
        </Link>
        <p className="deck__lead">You focus on your business. We&apos;ll take care of your website.</p>
      </div>
    </div>
  );
}
