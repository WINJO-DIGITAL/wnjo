"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ArrowRight } from "../Icons";
import { useDragScroll } from "./useDragScroll";

export type PlanCard = {
  id: string;
  name: string;
  summary: string;
  /** Price label, e.g. "£1,800"; `from` adds the "from" prefix. */
  price: string;
  from?: boolean;
  /** Shown after the price, e.g. "/month". */
  suffix?: string;
  includes?: readonly string[];
  href: string;
  cta: string;
  variant?: "inverse";
};

const canSpotlight = () =>
  window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
  !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Pricing as a swipeable row of cards. Clicking or focusing a card selects it,
 * so it's always clear which option you're looking at; its call to action
 * becomes the primary one. A soft spotlight and accent edge follow the cursor
 * across each card; inert on touch and with reduced motion.
 */
export function PlanSwiper({ plans, initial, label }: { plans: PlanCard[]; initial?: string; label: string }) {
  const { trackRef, active, atStart, atEnd, scrollable, step, trackProps } = useDragScroll<HTMLUListElement>();
  const [selected, setSelected] = useState(initial ?? plans[0]?.id);

  const onMove = (e: React.PointerEvent) => {
    trackProps.onPointerMove(e);
    if (e.pointerType !== "mouse" || !canSpotlight()) return;
    const card = (e.target as HTMLElement).closest<HTMLElement>(".plan");
    if (!card) return;
    const r = card.getBoundingClientRect();
    card.style.setProperty("--mx", `${(e.clientX - r.left).toFixed(0)}px`);
    card.style.setProperty("--my", `${(e.clientY - r.top).toFixed(0)}px`);
  };

  return (
    <div className="carousel carousel--plans">
      <ul
        ref={trackRef}
        role="list"
        className="carousel__track"
        aria-label={label}
        {...trackProps}
        onPointerMove={onMove}
      >
        {plans.map((plan, i) => {
          const isSelected = plan.id === selected;
          return (
            <li key={plan.id} className="carousel__item" aria-label={`${i + 1} of ${plans.length}: ${plan.name}`}>
              <article
                className={`plan${plan.variant ? ` plan--${plan.variant}` : ""}${isSelected ? " is-selected" : ""}`}
                onFocusCapture={(e) => {
                  // Keyboard focus selects; a mouse press only selects on click, so dragging doesn't.
                  if ((e.target as HTMLElement).matches(":focus-visible")) setSelected(plan.id);
                }}
              >
                {/* Covers the card, so a click anywhere on it selects the option. */}
                <button
                  type="button"
                  className="plan__select"
                  aria-pressed={isSelected}
                  aria-label={`Select ${plan.name}`}
                  onClick={() => setSelected(plan.id)}
                />
                <p className="plan__tag" aria-hidden={!isSelected}>
                  Selected
                </p>
                <h3 className="plan__name">{plan.name}</h3>
                <p className="plan__summary">{plan.summary}</p>
                <p className="plan__price">
                  {plan.from && <span>from</span>} {plan.price}
                  {plan.suffix && <span className="plan__suffix">{plan.suffix}</span>}
                </p>
                {plan.includes && (
                  <ul role="list" className="checks">
                    {plan.includes.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                )}
                <Link
                  href={plan.href}
                  draggable={false}
                  className={`btn ${isSelected ? "btn--primary" : "btn--secondary"} plan__cta`}
                >
                  {plan.cta}
                </Link>
              </article>
            </li>
          );
        })}
      </ul>

      <div className="container container--wide carousel__controls" hidden={!scrollable}>
        <p className="carousel__count" aria-hidden="true">
          <span>{String(active + 1).padStart(2, "0")}</span> / {String(plans.length).padStart(2, "0")}
        </p>
        <div className="carousel__dots" aria-hidden="true">
          {plans.map((p, i) => (
            <span key={p.id} className={i === active ? "is-active" : undefined} />
          ))}
        </div>
        <div className="carousel__buttons">
          <button type="button" onClick={() => step(-1)} disabled={atStart} aria-label="Previous option">
            <ArrowLeft size={16} />
          </button>
          <button type="button" onClick={() => step(1)} disabled={atEnd} aria-label="Next option">
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
