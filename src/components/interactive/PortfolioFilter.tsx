"use client";

import { useState, useSyncExternalStore } from "react";
import { INDUSTRIES, type Industry } from "@/lib/projects";

/**
 * Industry filter for the portfolio. The projects are server-rendered inside it, each marked with its industry, and
 * the filter hides the others with CSS. Without JavaScript the filter buttons don't appear and every project shows.
 */
export function PortfolioFilter({
  counts,
  children,
}: {
  counts: Record<Industry, number>;
  children: React.ReactNode;
}) {
  const [filter, setFilter] = useState<Industry | "all">("all");
  const ready = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const groups = INDUSTRIES.filter((g) => counts[g.id] > 0);

  return (
    <div className="portfolio" data-filter={filter}>
      {ready && (
        <div
          className="portfolio__filter"
          role="group"
          aria-label="Show work for"
        >
          <button
            type="button"
            aria-pressed={filter === "all"}
            onClick={() => setFilter("all")}
          >
            All work
          </button>
          {groups.map((g) => (
            <button
              key={g.id}
              type="button"
              aria-pressed={filter === g.id}
              onClick={() => setFilter(g.id)}
            >
              {g.label}
            </button>
          ))}
        </div>
      )}
      {ready && (
        <p className="portfolio__status" aria-live="polite">
          {filter === "all"
            ? ""
            : `Showing ${groups.find((g) => g.id === filter)?.label ?? ""}`}
        </p>
      )}
      {children}
    </div>
  );
}
