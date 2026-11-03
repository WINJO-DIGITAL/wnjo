"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "../Icons";
import { APPS } from "@/lib/appScreens";

// Operator screens first, then the driver's, as one loop.
const SCREENS = (Object.keys(APPS) as (keyof typeof APPS)[]).flatMap((key) =>
  APPS[key].screens.map((s) => ({ ...s, app: APPS[key].label })),
);
const N = SCREENS.length;

/** How far a screen sits from the front one, going the short way round the loop. */
function offset(i: number, front: number) {
  const d = (((i - front) % N) + N) % N;
  return d > N / 2 ? d - N : d;
}

/**
 * The booking apps as a fan of phones: one in front, its neighbours tucked behind.
 * Swipe, tap a side phone or use the arrows to bring another screen round to the front.
 */
export function PhoneFan() {
  const [front, setFront] = useState(1);
  const start = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);
  const go = (step: number) => setFront((f) => (f + step + N) % N);
  const current = SCREENS[front];

  return (
    <div className="fan" role="group" aria-roledescription="carousel" aria-label="Booking app screens">
      <div
        className="fan__stage"
        onPointerDown={(e) => {
          start.current = { x: e.clientX, y: e.clientY };
          swiped.current = false;
        }}
        onPointerUp={(e) => {
          const s = start.current;
          start.current = null;
          if (!s) return;
          const dx = e.clientX - s.x;
          if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(e.clientY - s.y)) {
            swiped.current = true;
            go(dx < 0 ? 1 : -1);
          }
        }}
        onPointerCancel={() => (start.current = null)}
      >
        {SCREENS.map((s, i) => {
          const pos = offset(i, front);
          const side = Math.abs(pos) === 1;
          return (
            <button
              key={s.src.src}
              type="button"
              className="fan__phone app-phone"
              data-pos={Math.max(-2, Math.min(2, pos))}
              aria-hidden={pos !== 0 && !side}
              tabIndex={side ? 0 : -1}
              aria-label={side ? `Show ${s.app}: ${s.title}` : s.alt}
              onClick={() => {
                if (!swiped.current && pos !== 0) setFront(i);
              }}
            >
              <Image src={s.src} alt="" sizes="(min-width: 64rem) 320px, 45vw" placeholder="blur" draggable={false} />
            </button>
          );
        })}
      </div>
      <div className="fan__bar">
        <button type="button" className="fan__arrow" onClick={() => go(-1)} aria-label="Previous screen">
          <ArrowLeft />
        </button>
        <p className="fan__caption" aria-live="polite">
          <span>
            {current.app} · {front + 1}/{N}
          </span>
          {current.title}
        </p>
        <button type="button" className="fan__arrow" onClick={() => go(1)} aria-label="Next screen">
          <ArrowRight />
        </button>
      </div>
    </div>
  );
}
