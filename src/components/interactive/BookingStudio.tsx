"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "../Icons";

/*
 * "Make it yours": a booking app the visitor restyles live, like a car configurator.
 * Pick a business, a colour and a look, and the phone redraws itself. The looks borrow
 * from booking flows we've built: EV Exec's dark, rounded one and Alex K Bells' bold,
 * square one. Every name, price and time shown is an example.
 */

const BUSINESSES = {
  transfers: "Airport transfers",
  coach: "PT & coaching",
  massage: "Massage therapy",
  barber: "Barber",
  garage: "Auto garage",
  tattoo: "Tattoo studio",
} as const;
type Business = keyof typeof BUSINESSES;

// Each accent is dark or light enough for its text colour to stay readable on it.
const COLOURS = [
  { id: "champagne", label: "Champagne", value: "#d5a538", on: "#1a1305" },
  { id: "copper", label: "Copper", value: "#a8502a", on: "#ffffff" },
  { id: "green", label: "Racing green", value: "#2e6b4e", on: "#ffffff" },
  { id: "ocean", label: "Ocean", value: "#2a5fc0", on: "#ffffff" },
  { id: "plum", label: "Plum", value: "#7d3c6b", on: "#ffffff" },
  { id: "ice", label: "Ice", value: "#c9d6e3", on: "#0b1220" },
] as const;

const STYLES = {
  executive: "Executive",
  bold: "Bold",
  soft: "Soft",
} as const;
type Style = keyof typeof STYLES;

const FEATURES = [
  ["Payments", "Stripe or your provider", "M3 7h18v10H3zM3 10.5h18M7 14h3"],
  ["Secure", "Encrypted checkout", "M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6zM9 12l2 2 4-4"],
  ["Your terms", "Agreed at booking", "M7 3h7l4 4v14H7zM14 3v4h4M10 12h5M10 16h5"],
  [
    "Your brand",
    "Logo, colours, style",
    "M12 3a9 9 0 1 0 0 18c1 0 1.5-.8 1.5-1.6 0-1.4 1-2.4 2.4-2.4H18a3 3 0 0 0 3-3A9 9 0 0 0 12 3zM7.5 11.5h.01M10 7.5h.01M15 7.5h.01",
  ],
] as const;

const WEEK = ["Mon 12", "Tue 13", "Wed 14", "Thu 15", "Fri 16"];

/** The week strip, with one day picked. */
function Days({ on }: { on: number }) {
  return (
    <div className="st-days">
      {WEEK.map((d, i) => (
        <span key={d} className={i === on ? "is-on" : undefined}>
          {d.split(" ")[0]}
          <b>{d.split(" ")[1]}</b>
        </span>
      ))}
    </div>
  );
}

/** Times for the picked day: one chosen, one already taken. */
function Slots({ times, on, off }: { times: string[]; on: number; off: number }) {
  return (
    <div className="st-slots">
      {times.map((t, i) => (
        <span key={t} className={i === on ? "is-on" : i === off ? "is-off" : undefined}>
          {t}
        </span>
      ))}
    </div>
  );
}

/** A list of services with prices, the first one picked. */
function Services({ items }: { items: string[][] }) {
  return items.map(([name, time, price], i) => (
    <div key={name} className={`st-line st-line--box${i === 0 ? " is-on" : ""}`}>
      <span>
        <b>{name}</b> <small>{time}</small>
      </span>
      <b>{price}</b>
    </div>
  ));
}

function Screen({ business }: { business: Business }) {
  if (business === "transfers")
    return (
      <>
        <p className="st-kicker">Step 1 of 3</p>
        <h4>Book your transfer</h4>
        <div className="st-option">
          <b>To the airport</b>
          <small>Departing · drop-off</small>
        </div>
        <div className="st-option is-on">
          <b>From the airport</b>
          <small>Landed · pick-up</small>
        </div>
        <div className="st-seg">
          <span>One way</span>
          <span className="is-on">Return</span>
        </div>
        <div className="st-line">
          <span>Manchester Airport</span>
          <b>£160</b>
        </div>
        <span className="st-btn">Continue</span>
      </>
    );
  if (business === "barber")
    return (
      <>
        <p className="st-kicker">Choose a service</p>
        <h4>Book a cut</h4>
        <Services
          items={[
            ["Skin fade", "30 min", "£18"],
            ["Cut & beard", "45 min", "£25"],
            ["Beard trim", "15 min", "£10"],
          ]}
        />
        <Days on={2} />
        <Slots times={["09:30", "10:15", "11:00", "13:30", "14:15", "16:00"]} on={2} off={1} />
        <span className="st-btn">Book 11:00 · £18</span>
      </>
    );
  if (business === "coach")
    return (
      <>
        <p className="st-kicker">Train with me</p>
        <h4>Book a session</h4>
        <div className="st-seg st-seg--3">
          <span>1:1 PT</span>
          <span className="is-on">Boxing</span>
          <span>Group</span>
        </div>
        <div className="st-line st-line--box is-on">
          <span>
            <b>Pad work</b> <small>45 min</small>
          </span>
          <b>£30</b>
        </div>
        <Days on={0} />
        <Slots times={["06:30", "07:15", "12:00", "17:30", "18:15", "19:00"]} on={4} off={3} />
        <div className="st-pay">
          <span>Card</span>
          <span>Apple Pay</span>
          <span>Google Pay</span>
        </div>
        <span className="st-btn">Pay £30 securely</span>
      </>
    );
  if (business === "massage")
    return (
      <>
        <p className="st-kicker">Choose a treatment</p>
        <h4>Book a massage</h4>
        <Services
          items={[
            ["Deep tissue", "60 min", "£55"],
            ["Hot stones", "75 min", "£65"],
            ["Thai massage", "90 min", "£70"],
          ]}
        />
        <div className="st-seg st-seg--3">
          <span className="is-on">Any therapist</span>
          <span>Mai</span>
          <span>Lina</span>
        </div>
        <Days on={3} />
        <Slots times={["10:00", "11:30", "13:00", "14:30", "16:00", "17:30"]} on={3} off={0} />
        <span className="st-btn">Book 14:30 · £55</span>
      </>
    );
  if (business === "garage")
    return (
      <>
        <p className="st-kicker">Book a service</p>
        <h4>Book your car in</h4>
        <div className="st-vehicle">
          <span className="st-plate">AB12 CDE</span>
          <span>
            <b>Ford Focus</b>
            <small>1.0 EcoBoost · Petrol</small>
          </span>
        </div>
        <Services
          items={[
            ["MOT", "45 min", "£54.85"],
            ["Interim service", "2 hrs", "£129"],
            ["Full service", "3 hrs", "£189"],
          ]}
        />
        <Days on={1} />
        <p className="st-kicker st-kicker--gap">Drop-off</p>
        <Slots times={["08:00", "08:30", "09:00"]} on={1} off={0} />
        <span className="st-btn">Book MOT · Tue 08:30</span>
      </>
    );
  return (
    <>
      <p className="st-kicker">Consultation &amp; deposit</p>
      <h4>Book your tattoo</h4>
      <p className="st-kicker st-kicker--gap">Size</p>
      <div className="st-seg st-seg--3">
        <span>Small</span>
        <span className="is-on">Medium</span>
        <span>Large</span>
      </div>
      <p className="st-kicker st-kicker--gap">Artist</p>
      <div className="st-artists">
        {[
          ["J", "Jade"],
          ["M", "Marco"],
          ["S", "Sam"],
        ].map(([initial, name], i) => (
          <span key={name} className={i === 0 ? "is-on" : undefined}>
            <i>{initial}</i>
            {name}
          </span>
        ))}
      </div>
      <div className="st-upload">＋ Add reference images</div>
      <Days on={4} />
      <div className="st-line">
        <span>
          Deposit <small>rest on the day</small>
        </span>
        <b>£50</b>
      </div>
      <span className="st-btn">Pay £50 deposit</span>
    </>
  );
}

// Two ways to pay for the finished app; prices are confirmed on the call, not shown here.
const PLANS = {
  own: { label: "Own it", line: "Pay once. It's yours.", brief: "own it outright" },
  subscribe: { label: "Subscribe", line: "Pay monthly. We keep it running.", brief: "pay monthly" },
} as const;
type Plan = keyof typeof PLANS;

export function BookingStudio() {
  const [business, setBusiness] = useState<Business>("barber");
  const [colour, setColour] = useState<(typeof COLOURS)[number]>(COLOURS[0]);
  const [style, setStyle] = useState<Style>("executive");
  const [name, setName] = useState("");
  const [plan, setPlan] = useState<Plan>("own");
  const row = useRef<HTMLDivElement>(null);
  const shown = name.trim() || "Your Business";

  // Everything chosen here travels to the enquiry form, so starting is one tap.
  const brief =
    `${name.trim() ? `${name.trim()}: a` : "A"} ${BUSINESSES[business].toLowerCase()} booking app in ` +
    `${colour.label}, ${STYLES[style]} look. I'd like to ${PLANS[plan].brief}.`;
  const orderHref = `/contact?topic=booking-software&brief=${encodeURIComponent(brief)}`;

  // On phones the business row swipes: start it with the picked business in view.
  useEffect(() => {
    const el = row.current;
    const picked = el?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (el && picked && el.scrollWidth > el.clientWidth) el.scrollLeft = picked.offsetLeft - el.offsetLeft - 16;
  }, []);

  return (
    <div className="studio" data-cta-hide>
      <figure className="studio__stage">
        <div className="app-phone studio__phone" aria-hidden="true">
          <div className="studio__screen">
            <div
              className="st-ui"
              data-style={style}
              style={{ "--a": colour.value, "--on-a": colour.on } as React.CSSProperties}
            >
              <div className="st-status">
                <span>9:41</span>
                <span className="st-status__icons" />
              </div>
              <div className="st-head">
                <span className="st-logo">{shown.charAt(0).toUpperCase()}</span>
                <span className="st-name">{shown}</span>
                <span className="st-menu" />
              </div>
              <div className="st-body" key={business}>
                <Screen business={business} />
              </div>
              <div className="st-tabs">
                {["Book", "Bookings", "Account"].map((t, i) => (
                  <span key={t} className={i === 0 ? "is-on" : undefined}>
                    <i />
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
        <figcaption className="studio__label" aria-live="polite">
          {BUSINESSES[business]} · {colour.label} · {STYLES[style]}
        </figcaption>
      </figure>

      <div className="studio__controls">
        <div className="studio__group">
          <label htmlFor="studio-name" className="studio__legend">
            Your business name
          </label>
          <input
            id="studio-name"
            className="studio__name"
            type="text"
            maxLength={24}
            autoComplete="organization"
            placeholder="Your Business"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <fieldset className="studio__group">
          <legend>Business</legend>
          <div className="studio__chips studio__chips--swipe" ref={row}>
            {(Object.keys(BUSINESSES) as Business[]).map((b) => (
              <button key={b} type="button" aria-pressed={business === b} onClick={() => setBusiness(b)}>
                {BUSINESSES[b]}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset className="studio__group">
          <legend>
            Colour <span>{colour.label}</span>
          </legend>
          <div className="studio__swatches">
            {COLOURS.map((c) => (
              <button
                key={c.id}
                type="button"
                aria-pressed={colour.id === c.id}
                aria-label={c.label}
                onClick={() => setColour(c)}
                style={{ "--swatch": c.value } as React.CSSProperties}
              />
            ))}
          </div>
        </fieldset>
        <fieldset className="studio__group">
          <legend>Look</legend>
          <div className="studio__chips">
            {(Object.keys(STYLES) as Style[]).map((s) => (
              <button key={s} type="button" aria-pressed={style === s} onClick={() => setStyle(s)}>
                {STYLES[s]}
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      {/* The order: the app they just made, how they'd like to pay, and one button. */}
      <div className="studio__order">
        <p className="studio__order-title">
          Your <span className="serif-em">{name.trim() || BUSINESSES[business]}</span> app
        </p>
        <fieldset className="studio__plans">
          <legend className="visually-hidden">How would you like to pay?</legend>
          {(Object.keys(PLANS) as Plan[]).map((p) => (
            <label key={p} className="studio__plan">
              <input type="radio" name="studio-plan" value={p} checked={plan === p} onChange={() => setPlan(p)} />
              <span>
                <b>{PLANS[p].label}</b>
                {PLANS[p].line}
              </span>
            </label>
          ))}
        </fieldset>
        <Link href={orderHref} className="btn btn--primary studio__order-btn">
          Make it mine
          <ArrowRight />
        </Link>
        <p className="studio__order-note">No payment now. We confirm your price on a short call.</p>
      </div>

      <ul role="list" className="studio__features">
        {FEATURES.map(([title, body, d]) => (
          <li key={title}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d={d} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <b>{title}</b>
            <span>{body}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
