"use client";

import { Children, useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Grow, Simplify and Build on one swipe on phones: the three sections sit side by side and snap,
 * with tabs above that show which one is in view and jump to the others. On wider screens the
 * sections simply stack and the tabs are hidden (see .stages in globals.css).
 */
export function StageSwiper({ labels, children }: { labels: string[]; children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const count = Children.count(children);

  // The slide in view follows the swipe position, whatever each slide's height.
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (el.clientWidth) setActive(Math.round(el.scrollLeft / el.clientWidth));
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  // On phones the strip takes the height of the slide in view, so a shorter slide doesn't end in a gap.
  useEffect(() => {
    const el = track.current;
    const slide = el?.children[active] as HTMLElement | undefined;
    if (!el || !slide) return;
    const phone = window.matchMedia("(max-width: 39.99rem)");
    const fit = () => {
      el.style.height = phone.matches ? `${slide.offsetHeight}px` : "";
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(slide);
    phone.addEventListener("change", fit);
    return () => {
      ro.disconnect();
      phone.removeEventListener("change", fit);
    };
  }, [active]);

  const go = (i: number) => {
    const el = track.current;
    const slide = el?.children[i] as HTMLElement | undefined;
    if (!el || !slide) return;
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ left: slide.offsetLeft, behavior: smooth ? "smooth" : "auto" });
    // If the visitor is part-way down a slide, bring the top of the next one into view.
    const box = root.current?.getBoundingClientRect();
    const tabs = root.current?.firstElementChild as HTMLElement | null;
    const offset = tabs ? parseFloat(getComputedStyle(tabs).top) || 0 : 0;
    if (box && box.top < offset) {
      window.scrollTo({ top: window.scrollY + box.top - offset, behavior: smooth ? "smooth" : "auto" });
    }
  };

  return (
    <div className="stages" ref={root}>
      <div className="stages__tabs" role="group" aria-label={`${count} ways we help`}>
        {labels.map((label, i) => (
          <button key={label} type="button" aria-pressed={i === active} onClick={() => go(i)}>
            {label}
          </button>
        ))}
      </div>
      <div className="stages__track" ref={track}>
        {children}
      </div>
    </div>
  );
}
