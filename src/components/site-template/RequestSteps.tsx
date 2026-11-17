"use client";

import { useRef, useState, useSyncExternalStore, type ReactNode, type TouchEvent } from "react";
import css from "./SiteRender.module.css";

/**
 * The request form in short steps. The form itself is ordinary server-rendered HTML that posts natively: the groups of
 * fields below are marked `data-step`, and this only decides which group shows. Without JavaScript every group shows and
 * the form works exactly as before. Each step is checked before the next one opens, and on a phone a swipe moves between
 * steps. Nothing is sent until the last step's button is pressed.
 */
export function RequestSteps({ labels, children }: { labels: string[]; children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(0);
  // False on the server and in the first render, true once the page is live: so the first paint shows every group.
  const enhanced = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const touch = useRef<{ x: number; y: number } | null>(null);
  const last = labels.length - 1;

  const fieldsOf = (step: number) => Array.from(root.current?.querySelectorAll<HTMLInputElement>(`[data-step="${step + 1}"] :is(input, select, textarea)`) ?? []);
  const go = (to: number) => {
    setCurrent(to);
    // Move the keyboard to the first field of the new step, so a screen reader announces where it is.
    requestAnimationFrame(() => fieldsOf(to).find((f) => f.type !== "hidden" && f.type !== "file" && f.tabIndex >= 0)?.focus());
  };
  const next = () => {
    if (current >= last) return;
    for (const f of fieldsOf(current)) if (!f.reportValidity()) return;
    go(current + 1);
  };
  const back = () => current > 0 && go(current - 1);

  const onTouchStart = (e: TouchEvent) => {
    touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchEnd = (e: TouchEvent) => {
    const t = touch.current;
    touch.current = null;
    if (!t || !enhanced) return;
    const dx = e.changedTouches[0].clientX - t.x;
    const dy = e.changedTouches[0].clientY - t.y;
    if (Math.abs(dx) < 70 || Math.abs(dy) > 40) return;
    if (dx < 0) next();
    else back();
  };

  return (
    <div ref={root} className={css.steps} data-enhanced={enhanced ? "" : undefined} data-current={current + 1} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      {enhanced && (
        <p className={css.stepNow} aria-live="polite">
          <span>
            Step {current + 1} of {labels.length}
          </span>
          {labels[current]}
        </p>
      )}
      {children}
      {enhanced && (
        <div className={css.stepNav}>
          {current > 0 && (
            <button type="button" className={css.btnGhost} onClick={back}>
              Back
            </button>
          )}
          {current < last && (
            <button type="button" className={css.btn} onClick={next}>
              Next
            </button>
          )}
        </div>
      )}
    </div>
  );
}
