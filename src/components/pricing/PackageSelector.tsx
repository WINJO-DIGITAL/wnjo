"use client";

import { useEffect, useState } from "react";
import { CARD_POINTS } from "./WebsitePackages";
import { OWNERSHIP, WEBSITE_PLANS, formatGBP, type WebsitePlanId } from "@/lib/pricing";

const PLAN_ORDER: WebsitePlanId[] = ["bronze", "silver", "gold"];

/**
 * The homepage's three monthly packages. Choosing one turns it dark and shows the next step; the others stay light.
 * Nothing is selected to start with. Each card is a real button, so it works with a keyboard and a screen reader.
 */
export function PackageSelector() {
  const [selected, setSelected] = useState<WebsitePlanId | null>(null);
  const chosen = selected ? WEBSITE_PLANS[selected] : null;
  // The sticky bar at the bottom of the screen shows "Build my website" for the chosen package.
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("wnjo:plan", { detail: selected }));
  }, [selected]);
  return (
    <div className="pkg-selector">
      <ul className="pkg-cards pkg-cards--compact" role="list">
        {PLAN_ORDER.map((id) => {
          const plan = WEBSITE_PLANS[id];
          const isSelected = selected === id;
          return (
            <li key={id} className={`pkg-card${isSelected ? " pkg-card--selected inverse" : ""}`}>
              {plan.popular && <p className="pkg-card__badge">Most popular</p>}
              <h3 className="pkg-card__name">{plan.name}</h3>
              <p className="pkg-card__price">
                <span className="pkg-card__amount">{formatGBP(plan.monthly)}</span>
                <span className="pkg-card__unit">a month</span>
              </p>
              <p className="pkg-card__setup">+ {formatGBP(plan.setup)} setup</p>
              <ul className="pkg-card__points" role="list">
                {CARD_POINTS[id].slice(0, 4).map((p) => (
                  <li key={p}>{p}</li>
                ))}
                <li>You own the website after {OWNERSHIP.ownershipAfterPayments} payments</li>
              </ul>
              <button
                type="button"
                className={`btn pkg-card__cta ${isSelected ? "pkg-card__cta--selected" : "btn--secondary"}`}
                aria-pressed={isSelected}
                onClick={() => setSelected(isSelected ? null : id)}
              >
                {isSelected ? "Selected" : "Select"}
              </button>
            </li>
          );
        })}
      </ul>
      {chosen && selected && (
        <p className="pkg-selector__next" role="status">
          <span>{chosen.name} selected.</span>
        </p>
      )}
    </div>
  );
}
