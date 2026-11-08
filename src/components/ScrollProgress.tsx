"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * A thin line along the bottom edge of the header that fills from left to right as the page is read,
 * reaching the full width at the end. It is a position indicator, so it is decorative to assistive
 * technology, and it updates directly (no easing) so it never lags behind the scroll.
 */
export function ScrollProgress() {
  const bar = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const el = bar.current;
    if (!el) return;
    let frame = 0;

    const update = () => {
      frame = 0;
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      const progress = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      el.style.setProperty("--progress", progress.toFixed(4));
      // A page that doesn't scroll shows no line at all.
      el.dataset.active = max > 0 ? "true" : "false";
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    // Content that loads or reveals after the first paint changes the page height.
    const ro = new ResizeObserver(schedule);
    ro.observe(document.body);

    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      ro.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [pathname]);

  return <div ref={bar} className="scroll-progress" aria-hidden="true" data-active="false" />;
}
