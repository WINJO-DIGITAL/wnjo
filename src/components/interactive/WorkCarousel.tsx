"use client";

import Link from "next/link";
import type { Project } from "@/lib/projects";
import { ArrowLeft, ArrowRight } from "../Icons";
import { ScrollShot } from "./ScrollShot";
import { Tilt } from "./Tilt";
import { useDragScroll } from "./useDragScroll";

type Item = Pick<Project, "slug" | "name" | "sector" | "location" | "host" | "showAddress" | "page" | "kind">;

/**
 * A full-bleed, swipeable row of projects. Native scroll-snap handles touch and
 * trackpads; mouse users can also drag. Each card scrolls its site on hover.
 */
export function WorkCarousel({ items }: { items: Item[] }) {
  const { trackRef, active, atStart, atEnd, step, trackProps } = useDragScroll<HTMLUListElement>();

  return (
    <div className="carousel">
      <ul
        ref={trackRef}
        role="list"
        className="carousel__track"
        aria-label="Selected projects"
        {...trackProps}
      >
        {items.map((p, i) => (
          <li key={p.slug} className={`carousel__item${i === active ? " is-current" : ""}`} aria-label={`${i + 1} of ${items.length}: ${p.name}`}>
            <Tilt className="carousel__tilt" max={4}>
              <Link href={`/work#${p.slug}`} className="carousel__card scroll-trigger" draggable={false}>
                <ScrollShot
                  src={p.page}
                  host={p.host}
                  name={p.name}
                  showAddress={p.showAddress}
                  alt={`The ${p.name} website`}
                  sizes="(min-width: 64rem) 640px, 84vw"
                />
                <span className="carousel__meta">
                  <span className="carousel__name">{p.name}</span>
                  <span className="carousel__sector">
                    {p.sector}
                    <span>{p.kind === "product" ? "Our platform" : p.location}</span>
                  </span>
                  <span className="carousel__go" aria-hidden="true">
                    <ArrowRight size={18} />
                  </span>
                </span>
              </Link>
            </Tilt>
          </li>
        ))}
      </ul>

      <div className="container container--wide carousel__controls">
        <p className="carousel__count" aria-hidden="true">
          <span>{String(active + 1).padStart(2, "0")}</span> / {String(items.length).padStart(2, "0")}
        </p>
        <div className="carousel__dots" aria-hidden="true">
          {items.map((p, i) => (
            <span key={p.slug} className={i === active ? "is-active" : undefined} />
          ))}
        </div>
        <div className="carousel__buttons">
          <button type="button" onClick={() => step(-1)} disabled={atStart} aria-label="Previous project">
            <ArrowLeft size={16} />
          </button>
          <button type="button" onClick={() => step(1)} disabled={atEnd} aria-label="Next project">
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
