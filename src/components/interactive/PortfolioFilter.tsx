"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { INDUSTRIES, type Industry } from "@/lib/projects";
import { ArrowLeft, ArrowRight } from "../Icons";

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * The portfolio, two ways. On phones and tablets the projects are a swipeable deck, one at a time, with
 * arrows and a count. On desktop an index beside the work lists the business types with how many projects
 * each has, and the matching projects show in full beside it. The projects are server-rendered inside it,
 * each marked with its industry; without JavaScript every project simply shows, stacked.
 */
export function PortfolioFilter({
  counts,
  children,
}: {
  counts: Record<Industry, number>;
  children: React.ReactNode;
}) {
  const [filter, setFilter] = useState<Industry | "all">("all");
  const [deck, setDeck] = useState({ index: 0, count: 0 });
  const rootRef = useRef<HTMLDivElement>(null);
  const ready = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const list = useCallback(
    () => rootRef.current?.querySelector<HTMLElement>(".work-list") ?? null,
    [],
  );
  const visibleRows = useCallback(() => {
    const l = list();
    if (!l) return [] as HTMLElement[];
    return Array.from(l.children).filter(
      (el): el is HTMLElement =>
        el instanceof HTMLElement && el.offsetParent !== null,
    );
  }, [list]);

  const measure = useCallback(() => {
    const l = list();
    if (!l) return;
    const rows = visibleRows();
    const edge = l.getBoundingClientRect().left;
    let nearest = 0;
    let best = Infinity;
    rows.forEach((row, i) => {
      const d = Math.abs(row.getBoundingClientRect().left - edge);
      if (d < best) {
        best = d;
        nearest = i;
      }
    });
    setDeck({ index: nearest, count: rows.length });
  }, [list, visibleRows]);

  useEffect(() => {
    const l = list();
    if (!ready || !l) return;
    l.tabIndex = 0;
    l.setAttribute("role", "region");
    l.setAttribute("aria-label", "Projects");
    const frame = requestAnimationFrame(measure);
    l.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(frame);
      l.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, [ready, filter, list, measure]);

  const go = (dir: 1 | -1) => {
    const l = list();
    const rows = visibleRows();
    const target =
      rows[Math.min(rows.length - 1, Math.max(0, deck.index + dir))];
    if (!l || !target) return;
    l.scrollTo({
      left:
        l.scrollLeft +
        target.getBoundingClientRect().left -
        l.getBoundingClientRect().left,
      behavior: "smooth",
    });
  };

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const groups = INDUSTRIES.filter((g) => counts[g.id] > 0);

  return (
    <div
      ref={rootRef}
      className={`portfolio${ready ? " portfolio--js" : ""}`}
      data-filter={filter}
    >
      {ready && (
        <nav className="portfolio__index" aria-label="Show work for">
          <ul role="list">
            <li>
              <button
                type="button"
                aria-pressed={filter === "all"}
                onClick={() => setFilter("all")}
              >
                <span>All work</span>
                <span className="portfolio__n">{pad(total)}</span>
              </button>
            </li>
            {groups.map((g) => (
              <li key={g.id}>
                <button
                  type="button"
                  aria-pressed={filter === g.id}
                  onClick={() => setFilter(g.id)}
                >
                  <span>{g.label}</span>
                  <span className="portfolio__n">{pad(counts[g.id])}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>
      )}
      {children}
      {ready && (
        <div className="portfolio__deck">
          <p className="carousel__count" aria-live="polite">
            <span>{pad(deck.index + 1)}</span> / {pad(deck.count)}
          </p>
          <div className="carousel__buttons">
            <button
              type="button"
              onClick={() => go(-1)}
              disabled={deck.index <= 0}
              aria-label="Previous project"
            >
              <ArrowLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              disabled={deck.index >= deck.count - 1}
              aria-label="Next project"
            >
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
