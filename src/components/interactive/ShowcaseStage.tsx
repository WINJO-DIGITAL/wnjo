"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { Project } from "@/lib/projects";
import { LivePreview } from "./LivePreview";

type Item = Pick<Project, "slug" | "name" | "sector" | "host" | "url" | "desktop" | "mobile" | "walkthrough" | "logo">;

/**
 * The laptop's base, drawn from directly above: keyboard and trackpad on a brushed
 * aluminium deck. CSS hinges it back from the lid in 3D, so the keyboard keeps its
 * real shape and perspective whichever way the laptop turns. Purely decorative.
 */
const KEY_ROWS = [14, 14, 14, 13, 12].map((count, row) => {
  const y = 46 + row * 52;
  const inset = 70;
  const gap = 10;
  const key = (1000 - inset * 2 - gap * (count - 1)) / count;
  return Array.from({ length: count }, (_, i) => ({
    x: inset + i * (key + gap),
    y,
    w: key,
  }));
});

function LaptopBase() {
  return (
    <svg
      className="laptop__base"
      viewBox="0 0 1000 640"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="deck" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#bdbab5" />
          <stop offset="1" stopColor="#d9d6d1" />
        </linearGradient>
      </defs>
      <rect width="1000" height="640" rx="28" fill="url(#deck)" />
      <rect x="0" y="0" width="1000" height="10" fill="#a8a49f" />
      {KEY_ROWS.flat().map((k) => (
        <rect key={`${k.x}-${k.y}`} x={k.x} y={k.y} width={k.w} height={42} rx={6} fill="#2b2a28" />
      ))}
      <rect x="330" y="346" width="340" height="230" rx="16" fill="#cbc8c3" stroke="#aeaaa5" strokeWidth="2" />
      <rect x="0" y="626" width="1000" height="14" rx="7" fill="#9c9893" />
    </svg>
  );
}

const reducedQuery = "(prefers-reduced-motion: reduce)";
const subscribeReduced = (onChange: () => void) => {
  const mq = window.matchMedia(reducedQuery);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
};

/** Pause before the first clip once the laptop is in view, and between one site's clip and the next. */
const FIRST_DELAY = 1000;
const NEXT_DELAY = 500;
/** How long each screenshot shows when clips can't start on their own. */
const STILL_INTERVAL = 6000;

/**
 * The homepage showcase: our real projects on a laptop. Once the laptop is in view, each
 * site's walkthrough clip plays in turn and moves on to the next site when it finishes.
 * The tabs jump to any site; tapping the screen or the button pauses and resumes. Clips
 * hold still while the laptop is out of view.
 * With reduced motion nothing plays until the visitor asks.
 */
export function ShowcaseStage({ items }: { items: Item[] }) {
  const [index, setIndex] = useState(0);
  // The visitor's choice, once made; until then reduced motion starts paused.
  const [paused, setPaused] = useState<boolean | null>(null);
  const reduced = useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia(reducedQuery).matches,
    () => false,
  );
  const userPaused = paused ?? reduced;
  const [inView, setInView] = useState(false);
  // Whether the current site's clip has started (until then its screenshot shows).
  const [clipOn, setClipOn] = useState(false);
  const [started, setStarted] = useState(false);
  // The browser won't start clips on its own (iPhone Low Power Mode): cycle the screenshots
  // instead, and play a clip only when the visitor taps.
  const [blocked, setBlocked] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLSpanElement>(null);
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(0);

  const go = useCallback(
    (i: number) => {
      setIndex((i + items.length) % items.length);
      setClipOn(false);
    },
    [items.length],
  );

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.6 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const running = inView && !userPaused;

  // Start the current site's clip after a short pause.
  useEffect(() => {
    if (!running || clipOn || blocked) return;
    const t = window.setTimeout(
      () => {
        setClipOn(true);
        setStarted(true);
      },
      started ? NEXT_DELAY : FIRST_DELAY,
    );
    return () => window.clearTimeout(t);
  }, [running, clipOn, started, index, blocked]);

  useEffect(() => {
    if (!running || !blocked || clipOn) return;
    const t = window.setTimeout(() => go(index + 1), STILL_INTERVAL);
    return () => window.clearTimeout(t);
  }, [running, blocked, clipOn, index, go]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") swipe.current = { x: e.clientX, y: e.clientY };
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const start = swipe.current;
    swipe.current = null;
    if (!start) return;
    const dx = e.clientX - start.x;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(e.clientY - start.y)) {
      swiped.current = Date.now();
      go(index + (dx < 0 ? 1 : -1));
    }
  };

  const current = items[index];
  const toggle = () => setPaused(!userPaused);

  return (
    <div className="showcase">
      <div
        ref={stageRef}
        className="laptop showcase__stage"
        role="group"
        aria-roledescription="carousel"
        aria-label="Recent work"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (swipe.current = null)}
      >
        <div className="laptop__view">
          <div className="laptop__body">
            <div className="laptop__screen">
              <div className="laptop__display showcase__frames">
                {items.map((p, i) => (
                  <Image
                    key={p.slug}
                    src={p.desktop}
                    alt={i === index ? `The ${p.name} website on a laptop` : ""}
                    aria-hidden={i !== index}
                    sizes="(min-width: 64rem) 900px, 90vw"
                    preload={i === 0}
                    fetchPriority={i === 0 ? "high" : undefined}
                    className={`showcase__img${i === index ? " is-active" : ""}`}
                  />
                ))}
                {clipOn && (
                  <LivePreview
                    key={current.slug}
                    {...current.walkthrough}
                    name={current.name}
                    paused={!running}
                    progress={progressRef}
                    onEnded={() => go(index + 1)}
                    onBlocked={() => {
                      setBlocked(true);
                      setClipOn(false);
                    }}
                  />
                )}
                <span className="laptop__hint" aria-hidden="true" hidden={!userPaused && !blocked}>
                  <span className="on-touch">Tap</span>
                  <span className="on-hover">Click</span> to play
                </span>
              </div>
              {/* Covers the screen, so a tap anywhere on it pauses or resumes the walkthrough. */}
              <button
                type="button"
                className="laptop__hit"
                aria-label={
                  userPaused || (blocked && !clipOn)
                    ? `Play the ${current.name} walkthrough`
                    : `Pause the ${current.name} walkthrough`
                }
                onClick={() => {
                  if (Date.now() - swiped.current <= 400) return;
                  if (blocked && !clipOn) {
                    // A tap counts as permission to play; from here clips carry on as normal.
                    setBlocked(false);
                    setPaused(false);
                    setClipOn(true);
                  } else toggle();
                }}
              />
            </div>
            <LaptopBase />
          </div>
        </div>
        {/* The same site on a phone, standing in front of the laptop. */}
        <figure className="phone">
          <div className="phone__screen showcase__frames">
            {items.map((p, i) => (
              <Image
                key={p.slug}
                src={p.mobile}
                alt={i === index ? `The ${p.name} website on a phone` : ""}
                aria-hidden={i !== index}
                sizes="(min-width: 64rem) 180px, 25vw"
                className={`showcase__img${i === index ? " is-active" : ""}`}
              />
            ))}
          </div>
        </figure>
      </div>

      <div className="showcase__bar">
        <div className="showcase__tabs" aria-label="Choose a project" role="group">
          {items.map((p, i) => (
            <button
              key={p.slug}
              type="button"
              aria-pressed={i === index}
              className="showcase__tab"
              onClick={() => go(i)}
            >
              <Image src={p.logo} alt="" width={28} height={28} sizes="28px" className="showcase__tab-logo" />
              <span className="showcase__tab-name">{p.name}</span>
              <span className="showcase__progress" aria-hidden="true">
                {/* Filled by the clip as it plays. */}
                {i === index && <span ref={progressRef} key={index} />}
              </span>
            </button>
          ))}
        </div>
        <div className="showcase__meta">
          <p className="showcase__caption" aria-live="polite">
            {current.sector}
          </p>
          <Link href={`/work#${current.slug}`} className="showcase__link showcase__link--primary">
            View project
          </Link>
          <a
            href={current.url}
            target="_blank"
            rel="noopener noreferrer"
            className="showcase__link"
            aria-label={`View live: the ${current.name} website (opens in a new tab)`}
          >
            View live ↗
          </a>
          <button
            type="button"
            className="showcase__pause"
            onClick={toggle}
            aria-label={userPaused ? "Play the walkthroughs" : "Pause the walkthroughs"}
          >
            {userPaused ? (
              <svg width="10" height="12" viewBox="0 0 10 12" aria-hidden="true">
                <path d="M0 0l10 6-10 6z" fill="currentColor" />
              </svg>
            ) : (
              <svg width="10" height="12" viewBox="0 0 10 12" aria-hidden="true">
                <path d="M0 0h3v12H0zM7 0h3v12H7z" fill="currentColor" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
