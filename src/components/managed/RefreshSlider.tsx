"use client";

import { useEffect, useRef, useState } from "react";
import { RefreshBrowser } from "./RefreshTimeline";

/**
 * Winjo Refresh, shown as a before and after: the same example website at month 24 and after its refresh, with a
 * handle to drag between them. Drag with a mouse, finger or the arrow keys. It sweeps once when it first scrolls into
 * view so the visitor sees it move, unless they prefer less motion or have already taken over. The site is an
 * illustration drawn in CSS; it claims nothing about a real client.
 */
export function RefreshSlider() {
  const [pos, setPos] = useState(50);
  const [touched, setTouched] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  // One gentle sweep across and back when it first comes into view.
  useEffect(() => {
    const el = stage.current;
    if (!el || touched) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    let cancelled = false;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        const start = performance.now();
        const length = 2400;
        const step = (now: number) => {
          if (cancelled) return;
          const t = Math.min(1, (now - start) / length);
          // 50 -> 85 -> 15 -> 50, easing out so it settles in the middle.
          setPos(50 + 35 * Math.sin(t * Math.PI * 2) * (1 - t * 0.4));
          if (t < 1) frame = requestAnimationFrame(step);
          else setPos(50);
        };
        frame = requestAnimationFrame(step);
      },
      { threshold: 0.6 },
    );
    observer.observe(el);
    return () => {
      cancelled = true;
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [touched]);

  const move = (clientX: number) => {
    const el = stage.current;
    if (!el) return;
    const box = el.getBoundingClientRect();
    setTouched(true);
    setPos(Math.max(0, Math.min(100, ((clientX - box.left) / box.width) * 100)));
  };

  return (
    <figure className="rfc">
      <div
        ref={stage}
        className="rfc__stage"
        style={{ "--pos": `${pos}%` } as React.CSSProperties}
        onPointerDown={(e) => {
          dragging.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          move(e.clientX);
        }}
        onPointerMove={(e) => {
          if (dragging.current) move(e.clientX);
        }}
        onPointerUp={() => {
          dragging.current = false;
        }}
        onPointerCancel={() => {
          dragging.current = false;
        }}
      >
        <div className="rf rfc__layer" data-era="launch">
          <RefreshBrowser />
        </div>
        <div className="rf rfc__layer rfc__layer--after" data-era="first" aria-hidden="true">
          <RefreshBrowser />
        </div>
        <span className="rfc__tag rfc__tag--before">Month 24, before</span>
        <span className="rfc__tag rfc__tag--after">After your refresh</span>
        <span className="rfc__handle" aria-hidden="true">
          <span className="rfc__grip" />
        </span>
        <input
          className="visually-hidden"
          type="range"
          min={0}
          max={100}
          value={Math.round(pos)}
          aria-label="Drag to compare the website before and after its refresh"
          onChange={(e) => {
            setTouched(true);
            setPos(Number(e.target.value));
          }}
        />
      </div>
      <figcaption className="rfc__caption">An example website, for illustration. Your refresh is designed around your own business and brand.</figcaption>
    </figure>
  );
}
