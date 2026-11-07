"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { PACKAGES, formatGBP } from "@/lib/pricing";
import { Stopwatch } from "@/components/Icons";

type PackageKey = keyof typeof PACKAGES;
const ORDER: PackageKey[] = ["essential", "professional", "premium"];

/**
 * The homepage's price button. Pressing it opens the three packages in place; choosing one shows its price and what
 * it includes, and the button then carries on to the price form for that package. Nothing is sent until they continue.
 */
export function PriceChooser({ variant = "default", sub }: { variant?: "default" | "deck"; sub?: string }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<PackageKey>("essential");
  const panelId = useId();
  const pkg = PACKAGES[selected];

  return (
    <div className="price-chooser">
      {variant === "deck" ? (
        <button
          type="button"
          className="deck__btn price-chooser__deck"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((v) => !v)}
        >
          <Stopwatch size={20} />
          <span className="deck__btn-text">
            <span className="deck__btn-main">{open ? "Close prices" : "Get my price"}</span>
            <span className="deck__btn-sub">{open ? "Choose a package below" : sub}</span>
          </span>
        </button>
      ) : (
        <button
          type="button"
          className="btn btn--primary price-chooser__toggle"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((v) => !v)}
        >
          <Stopwatch />
          {open ? "Close prices" : "Get my price"}
        </button>
      )}

      <div id={panelId} className="price-chooser__panel" data-open={open} hidden={!open}>
        <div className="price-chooser__tabs" role="tablist" aria-label="Packages">
          {ORDER.map((key) => {
            const p = PACKAGES[key];
            const on = key === selected;
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={on}
                className="price-chooser__tab"
                data-on={on}
                onClick={() => setSelected(key)}
              >
                {p.name}
              </button>
            );
          })}
        </div>

        <div className="price-chooser__card" role="tabpanel" key={selected}>
          <p className="price-chooser__from">
            from <strong>{formatGBP(pkg.from)}</strong>
          </p>
          <p className="price-chooser__meta">{pkg.summary}</p>
          <ul className="price-chooser__list">
            {pkg.includes.filter((item) => !item.startsWith("Up to")).slice(0, 3).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <Link href="/build" className="btn btn--primary price-chooser__go">
            Continue with {pkg.name}
          </Link>
        </div>
      </div>
    </div>
  );
}
