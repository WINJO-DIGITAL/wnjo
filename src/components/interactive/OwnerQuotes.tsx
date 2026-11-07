"use client";

import Image, { type StaticImageData } from "next/image";
import { useState } from "react";

export type OwnerQuoteItem = {
  slug: string;
  name: string;
  logo: StaticImageData;
  location: string;
  url: string;
  host: string;
  /** A sentence taken word for word from the quote, shown large. */
  pull: string;
  /** The owner's full approved words. */
  quote: string;
};

/**
 * One owner at a time: a row of business logos to choose from, then that owner's strongest sentence large and
 * their full words beneath. The choices sit above the quote, so they never move under your finger.
 */
export function OwnerQuotes({ items }: { items: OwnerQuoteItem[] }) {
  const [active, setActive] = useState(0);
  return (
    <div className="oq">
      <div className="oq__switch" role="group" aria-label="Choose an owner">
        {items.map((item, i) => (
          <button
            key={item.slug}
            type="button"
            aria-pressed={i === active}
            aria-controls={`oq-${item.slug}`}
            onClick={() => setActive(i)}
          >
            <Image src={item.logo} alt="" width={28} height={28} />
            <span>{item.name}</span>
          </button>
        ))}
      </div>
      <div className="oq__stage">
        {items.map((item, i) => (
          <figure key={item.slug} className="oq__item" data-active={i === active} aria-hidden={i !== active} id={`oq-${item.slug}`}>
            <blockquote>
              <p className="oq__pull">{`“${item.pull}”`}</p>
              <p className="oq__full">{item.quote}</p>
            </blockquote>
            <figcaption className="oq__by">
              Owner, {item.name} · {item.location} ·{" "}
              <a href={item.url} target="_blank" rel="noopener noreferrer" tabIndex={i === active ? undefined : -1}>
                Visit {item.host}
                <span className="visually-hidden"> (opens in a new tab)</span>
              </a>
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
