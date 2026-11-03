"use client";

import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import barberCut from "../../../public/styler/barber-cut.webp";
import barberFade from "../../../public/styler/barber-fade.webp";
import barberHero from "../../../public/styler/barber-hero.webp";
import barberShave from "../../../public/styler/barber-shave.webp";
import cafeHero from "../../../public/styler/cafe-hero.webp";
import cafePlates from "../../../public/styler/cafe-plates.webp";
import cafeSourdough from "../../../public/styler/cafe-sourdough.webp";
import cafeWine from "../../../public/styler/cafe-wine.webp";
import clinicHero from "../../../public/styler/clinic-hero.webp";
import clinicKnee from "../../../public/styler/clinic-knee.webp";
import clinicRehab from "../../../public/styler/clinic-rehab.webp";
import clinicSports from "../../../public/styler/clinic-sports.webp";
import tradesFuse from "../../../public/styler/trades-fuse.webp";
import tradesHero from "../../../public/styler/trades-hero.webp";
import tradesRewires from "../../../public/styler/trades-rewires.webp";
import tradesTesting from "../../../public/styler/trades-testing.webp";
import { ArrowRight } from "../Icons";

/*
 * Bespoke, shown: one website on a screen and a phone, redrawn for each business the
 * visitor picks (tap a chip or swipe the picture). While it's on screen it cycles on its
 * own until the visitor takes over, and the button under it then names their pick and
 * carries it into the 2-minute estimate. Every business, name and line shown is an example; the
 * photos are Unsplash stock (free licence), cropped to their frames in public/styler.
 */

const SITES = [
  {
    id: "cafe",
    kind: "Café",
    name: "Oak & Ember",
    host: "oakandember.co.uk",
    title: "Wood-fired, all day.",
    line: "Breakfast till late, in the heart of Leeds.",
    cta: "Book a table",
    nav: ["Menu", "Visit", "Events"],
    photo: cafeHero,
    cards: [
      ["Sourdough", cafeSourdough],
      ["Small plates", cafePlates],
      ["Natural wine", cafeWine],
    ],
  },
  {
    id: "barber",
    kind: "Barber",
    name: "Blade & Co",
    host: "bladeandco.co.uk",
    title: "Sharp cuts. Hot towels.",
    line: "Walk-ins and bookings in Sheffield.",
    cta: "Book a cut",
    nav: ["Cuts", "Barbers", "Prices"],
    photo: barberHero,
    cards: [
      ["Cut & style", barberCut],
      ["Skin fade", barberFade],
      ["Hot towel shave", barberShave],
    ],
  },
  {
    id: "trades",
    kind: "Electrician",
    name: "Spark & Co",
    host: "sparkandco.co.uk",
    title: "Safe. Certified. On time.",
    line: "Electricians across Greater Manchester.",
    cta: "Get a free quote",
    nav: ["Services", "Areas", "Reviews"],
    photo: tradesHero,
    cards: [
      ["Rewires", tradesRewires],
      ["Fuse boards", tradesFuse],
      ["Testing", tradesTesting],
    ],
  },
  {
    id: "clinic",
    kind: "Physio",
    name: "Calm Physio",
    host: "calmphysio.co.uk",
    title: "Move freely again.",
    line: "Same-week physiotherapy in Bristol.",
    cta: "Book online",
    nav: ["Treatments", "About", "Fees"],
    photo: clinicHero,
    cards: [
      ["Sports injury", clinicSports],
      ["Rehab", clinicRehab],
      ["Knee pain", clinicKnee],
    ],
  },
] as const;

type Site = (typeof SITES)[number];

/** A photo filling its frame (the frame sets the shape; the crop is in the file). */
function Photo({ src, sizes }: { src: StaticImageData; sizes: string }) {
  return (
    <span className="ss-photo">
      <Image src={src} alt="" sizes={sizes} />
    </span>
  );
}

function Desktop({ site }: { site: Site }) {
  return (
    <div className="ss-site" key={site.id}>
      <div className="ss-nav">
        <b className="ss-logo">{site.name}</b>
        {site.nav.map((n) => (
          <span key={n}>{n}</span>
        ))}
        <span className="ss-btn ss-btn--sm">{site.cta}</span>
      </div>
      <div className="ss-hero">
        <div>
          <b className="ss-title">{site.title}</b>
          <span className="ss-line">{site.line}</span>
          <span className="ss-btn">{site.cta}</span>
        </div>
        <Photo src={site.photo} sizes="(min-width: 56rem) 400px, 40vw" />
      </div>
      <div className="ss-cards">
        {site.cards.map(([c, img]) => (
          <span key={c}>
            <Photo src={img} sizes="(min-width: 56rem) 240px, 25vw" />
            {c}
          </span>
        ))}
      </div>
    </div>
  );
}

function Mobile({ site }: { site: Site }) {
  return (
    <div className="ss-site" key={site.id}>
      <div className="ss-nav">
        <b className="ss-logo">{site.name}</b>
        <i className="ss-menu" />
      </div>
      <Photo src={site.photo} sizes="(min-width: 56rem) 260px, 30vw" />
      <b className="ss-title">{site.title}</b>
      <span className="ss-line">{site.line}</span>
      <span className="ss-btn">{site.cta}</span>
      <div className="ss-cards">
        {site.cards.slice(0, 2).map(([c, img]) => (
          <span key={c}>
            <Photo src={img} sizes="(min-width: 56rem) 120px, 15vw" />
            {c}
          </span>
        ))}
      </div>
    </div>
  );
}

export function SiteStyler() {
  const [i, setI] = useState(0);
  const [auto, setAuto] = useState(true);
  const root = useRef<HTMLDivElement>(null);
  const start = useRef<number | null>(null);
  const site = SITES[i];
  // Only once the visitor has picked does the button name their business (not while it cycles),
  // and carry it into the estimate.
  const href = auto ? "/build" : `/build?business=${encodeURIComponent(site.kind)}`;

  const pick = (n: number) => {
    setAuto(false);
    setI((n + SITES.length) % SITES.length);
  };

  // Cycle through the businesses while the picture is on screen, until the visitor takes over.
  useEffect(() => {
    const el = root.current;
    if (!el || !auto || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let timer: number | undefined;
    const io = new IntersectionObserver(
      ([e]) => {
        window.clearInterval(timer);
        if (e.isIntersecting) timer = window.setInterval(() => setI((n) => (n + 1) % SITES.length), 3200);
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      window.clearInterval(timer);
    };
  }, [auto]);

  return (
    <div className="ss" data-site={site.id} ref={root} data-cta-hide>
      <div
        className="ss-duo"
        aria-hidden="true"
        onPointerDown={(e) => (start.current = e.clientX)}
        onPointerUp={(e) => {
          const dx = start.current === null ? 0 : e.clientX - start.current;
          start.current = null;
          if (Math.abs(dx) > 40) pick(i + (dx < 0 ? 1 : -1));
        }}
      >
        <div className="ss-screen">
          <div className="ss-url">{site.host}</div>
          <div className="ss-view ss-view--desktop">
            <Desktop site={site} />
          </div>
        </div>
        <div className="app-phone ss-phone">
          <div className="ss-view ss-view--mobile">
            <Mobile site={site} />
          </div>
        </div>
      </div>
      <fieldset className="ss-pick">
        <legend className="visually-hidden">See the website styled for</legend>
        <div className="studio__chips">
          {SITES.map((s, n) => (
            <button key={s.id} type="button" aria-pressed={n === i} onClick={() => pick(n)}>
              {s.kind}
            </button>
          ))}
        </div>
      </fieldset>
      <Link href={href} className="btn btn--primary">
        {auto ? "Get my website price" : `Price my ${site.kind.toLowerCase()} website`}
        <ArrowRight />
      </Link>
    </div>
  );
}
