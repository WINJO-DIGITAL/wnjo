"use client";

import { useEffect, useState } from "react";
import { CARD_POINTS, PLAN_ORDER } from "./WebsitePackages";
import { WEBSITE_PLANS, formatGBP, type WebsitePlanId } from "@/lib/pricing";
import { PLAN_EVENT } from "@/lib/plan-selection";

/**
 * The homepage plans, chosen by the visitor. Choosing a plan highlights its card and tells the sticky bar, which
 * then offers to continue with that plan. The card design is the same as the plan cards everywhere else.
 */
export function PlanChooser() {
  const [selected, setSelected] = useState<WebsitePlanId | null>(null);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent<WebsitePlanId | null>(PLAN_EVENT, { detail: selected }));
  }, [selected]);

  return (
    <div className="pkg-selector">
      <ul className="pkg-cards" role="list">
        {PLAN_ORDER.map((id) => {
          const plan = WEBSITE_PLANS[id];
          const isSelected = selected === id;
          return (
            <li key={id} className={`pkg-card${isSelected ? " pkg-card--selected inverse" : ""}`} aria-current={isSelected || undefined}>
              <h3 className="pkg-card__name">{plan.name}</h3>
              <p className="pkg-card__price">
                <span className="pkg-card__amount">{formatGBP(plan.monthly)}</span>
                <span className="pkg-card__unit">a month</span>
              </p>
              <p className="pkg-card__tagline">{plan.tagline}</p>
              <ul className="pkg-card__points" role="list">
                {CARD_POINTS[id].slice(0, 4).map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
              <button
                type="button"
                className={`btn pkg-card__cta ${isSelected ? "btn--primary pkg-card__cta--selected" : "btn--secondary"}`}
                aria-pressed={isSelected}
                onClick={() => setSelected(id)}
              >
                {isSelected ? `${plan.name} selected` : `Choose ${plan.name}`}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
