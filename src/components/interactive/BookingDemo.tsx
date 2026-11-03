"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import evLogo from "../../../public/work/logos/ev-exec.png";
import opBookings from "../../../public/work/app/op-bookings.webp";

/*
 * A replay of EV Exec's booking flow: a customer taps through the three steps on their
 * phone, sends the request, and it lands in the operator app beside it as a notification.
 * The screens are drawn in EV Exec's own design rather than filmed, so they stay sharp at
 * any size and no booking is ever made. Customer details are examples.
 */

type State = {
  step: 1 | 2 | 3 | 4;
  dir: boolean;
  ret: boolean;
  airport: boolean;
  addr: string;
  date: string;
  time: string;
  flight: string;
  rdate: string;
  rtime: string;
  name: string;
  phone: string;
  terms: boolean;
  sending: boolean;
  ping: boolean;
  scroll: number;
  focus: string;
  tap: string;
  tapAt: number;
};

const START: State = {
  step: 1,
  dir: false,
  ret: false,
  airport: false,
  addr: "",
  date: "",
  time: "",
  flight: "",
  rdate: "",
  rtime: "",
  name: "",
  phone: "",
  terms: false,
  sending: false,
  ping: false,
  scroll: 0,
  focus: "",
  tap: "",
  tapAt: -1,
};

type Event = [number, Partial<State> | ((s: State, t: number) => Partial<State>)];

const events: Event[] = [];
let clock = 0;
const at = (ms: number, patch: Event[1]) => events.push([(clock += ms), patch]);
const tap = (ms: number, id: string, patch: Partial<State> = {}) => {
  at(ms, (_, t) => ({ tap: id, tapAt: t }));
  at(180, patch);
};
const type = (ms: number, field: keyof State, text: string, perChar = 55) => {
  at(ms, { focus: field });
  for (let i = 1; i <= text.length; i++) at(i === 1 ? 0 : perChar, { [field]: text.slice(0, i) });
};

// Step 1: direction and journey type.
tap(1100, "dir", { dir: true });
tap(900, "ret", { ret: true });
tap(900, "next1", { step: 2 });
// Step 2: airport and drop-off address.
tap(1000, "man", { airport: true });
at(450, { scroll: 17 });
tap(500, "addr");
type(150, "addr", "12 Clifton Drive, Lytham St Annes", 45);
at(700, { step: 3, scroll: 0, focus: "" });
// Step 3: dates, flight, details.
tap(900, "date", { date: "Fri 23 Oct" });
tap(500, "time", { time: "21:35" });
tap(450, "flight");
type(100, "flight", "EZY2145", 80);
at(500, { scroll: 13, focus: "" });
tap(500, "rdate", { rdate: "Fri 30 Oct" });
tap(450, "rtime", { rtime: "18:20" });
at(500, { scroll: 31 });
tap(500, "name");
type(100, "name", "Sarah Mitchell", 60);
tap(400, "phone");
type(100, "phone", "07700 900123", 60);
at(450, { scroll: 43, focus: "" });
tap(600, "terms", { terms: true });
tap(700, "send", { sending: true });
at(900, { step: 4, sending: false, scroll: 0 });
at(700, { ping: true });
const END = clock;
const LOOP = END + 4500;

function stateAt(t: number): State {
  let s = START;
  for (const [time, patch] of events) {
    if (time > t) break;
    s = { ...s, ...(typeof patch === "function" ? patch(s, time) : patch) };
  }
  return s;
}

const subscribeMotion = (cb: () => void) => {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};

export function BookingDemo() {
  const reduced = useSyncExternalStore(
    subscribeMotion,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
  const [t, setT] = useState(0);
  const [paused, setPaused] = useState(false);
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (reduced || paused || !inView) return;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      setT((v) => (v + dt) % LOOP);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [reduced, paused, inView]);

  const now = reduced ? END : t;
  const s = stateAt(now);
  const fading = !reduced && now > LOOP - 500;
  const tapped = (id: string) =>
    s.tap === id && now - s.tapAt < 520 ? <span key={s.tapAt} className="bd-tap" aria-hidden="true" /> : null;
  const field = (id: keyof State, value: string, placeholder: string) => (
    <span className={`bd-input${s.focus === id ? " is-focus" : ""}`}>
      {value ? <span>{value}</span> : <span className="bd-ph">{placeholder}</span>}
      {s.focus === id && <span className="bd-caret" />}
      {tapped(id)}
    </span>
  );

  return (
    <div className="bd" ref={ref} data-cta-hide>
      <div
        className="bd__phones"
        role="img"
        aria-label="A customer books a return transfer from Manchester Airport on the EV Exec website in three steps, and the request arrives in the operator app as a notification."
        data-fading={fading}
      >
        <div className="app-phone bd__phone bd__phone--customer" aria-hidden="true">
          <div className="bd__screen">
            <div className="bd-ui">
              <div className="bd-status">
                <span>21:02</span>
                <span className="bd-status__icons" />
              </div>
              <div className="bd-head">
                <Image src={evLogo} alt="" width={28} height={28} />
                <span>
                  EV EXEC<small>Exclusive · Executive · Electric</small>
                </span>
              </div>
              <div className="bd-body" style={{ transform: `translateY(${-s.scroll}em)` }}>
                {s.step < 4 && (
                  <div className="bd-top">
                    <h3>
                      Book Your <em>Transfer</em>
                    </h3>
                    <ol className="bd-steps">
                      {[1, 2, 3].map((n) => (
                        <li key={n} data-state={s.step > n ? "done" : s.step === n ? "on" : "off"}>
                          {s.step > n ? "✓" : n}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {s.step === 1 && (
                  <div className="bd-step" key="1">
                    <p className="bd-label">Step 1 of 3</p>
                    <h4>Your Journey</h4>
                    <p className="bd-sub">Tell us the direction and type of your trip</p>
                    <div className="bd-option">
                      <span className="bd-icon">✈</span>
                      <span>
                        <b>To the Airport</b>
                        <small>I&apos;m departing · drop-off</small>
                      </span>
                      <span className="bd-radio" />
                    </div>
                    <div className={`bd-option${s.dir ? " is-on" : ""}`}>
                      <span className="bd-icon bd-icon--land">✈</span>
                      <span>
                        <b>From the Airport</b>
                        <small>I&apos;ve landed · pick-up</small>
                      </span>
                      <span className="bd-radio" />
                      {tapped("dir")}
                    </div>
                    <p className="bd-label">Journey type</p>
                    <div className="bd-toggle" data-ret={s.ret}>
                      <span>⇄ One Way</span>
                      <span>
                        ↻ Return
                        {tapped("ret")}
                      </span>
                    </div>
                    <span className={`bd-btn${s.dir ? " is-on" : ""}`}>
                      {s.dir ? "Continue →" : "Select a direction above"}
                      {tapped("next1")}
                    </span>
                  </div>
                )}

                {s.step === 2 && (
                  <div className="bd-step" key="2">
                    <div className="bd-titlebar">
                      <span className="bd-back">←</span>
                      <span>
                        <p className="bd-label">Step 2 of 3</p>
                        <h4>Where are you going?</h4>
                      </span>
                    </div>
                    <p className="bd-label">Flying from which airport?</p>
                    {[
                      ["man", "Manchester Airport", "£90 one way · £160 return"],
                      ["liv", "Liverpool Airport", "£95 one way · £170 return"],
                      ["lba", "Leeds Bradford Airport", "£135 one way · £250 return"],
                    ].map(([id, name, price]) => (
                      <div key={id} className={`bd-airport${id === "man" && s.airport ? " is-on" : ""}`}>
                        <b>{name}</b>
                        <small>{price}</small>
                        {id === "man" && tapped("man")}
                      </div>
                    ))}
                    <div className="bd-card">
                      <b className="bd-card__title">⌖ Drop Off Address</b>
                      {field("addr", s.addr, "Enter your address…")}
                    </div>
                  </div>
                )}

                {s.step === 3 && (
                  <div className="bd-step" key="3">
                    <div className="bd-titlebar">
                      <span className="bd-back">←</span>
                      <span>
                        <p className="bd-label">Step 3 of 3</p>
                        <h4>Trip Details</h4>
                      </span>
                    </div>
                    <div className="bd-card">
                      <b className="bd-card__title">◷ Pick-up</b>
                      <div className="bd-row">
                        {field("date", s.date, "Travel date")}
                        {field("time", s.time, "--:--")}
                      </div>
                      {field("flight", s.flight, "Flight no. e.g. EZY2145")}
                    </div>
                    <div className="bd-card">
                      <b className="bd-card__title">↻ Return</b>
                      <div className="bd-row">
                        {field("rdate", s.rdate, "Return date")}
                        {field("rtime", s.rtime, "--:--")}
                      </div>
                    </div>
                    <div className="bd-card">
                      <b className="bd-card__title">◡ Your Details</b>
                      {field("name", s.name, "Full name *")}
                      {field("phone", s.phone, "Phone number *")}
                    </div>
                    <div className="bd-terms">
                      <span className={`bd-check${s.terms ? " is-on" : ""}`}>
                        {s.terms ? "✓" : ""}
                        {tapped("terms")}
                      </span>
                      <span>
                        I accept the <em>Booking Policy</em> and <em>Terms</em>
                      </span>
                    </div>
                    <span className="bd-btn is-on bd-btn--send">
                      {s.sending ? <span className="bd-spin" /> : "Request My Transfer"}
                      {tapped("send")}
                    </span>
                  </div>
                )}

                {s.step === 4 && (
                  <div className="bd-step bd-done" key="4">
                    <span className="bd-done__tick">✓</span>
                    <h4>Request received</h4>
                    <p className="bd-sub">We&apos;ll confirm your transfer by text shortly.</p>
                    <div className="bd-card bd-summary">
                      <p className="bd-label">Reference</p>
                      <b>EVX-7K2M9QH4</b>
                      <p className="bd-label">Pick-up</p>
                      <b>Manchester Airport · Fri 23 Oct, 21:35</b>
                      <p className="bd-label">Return</p>
                      <b>Lytham St Annes · Fri 30 Oct, 18:20</b>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="app-phone bd__phone bd__phone--ops" aria-hidden="true">
          <div className="bd__screen">
            <Image src={opBookings} alt="" sizes="(min-width: 64rem) 240px, 40vw" placeholder="blur" />
            <div className={`bd-ping${s.ping ? " is-in" : ""}`}>
              <Image src={evLogo} alt="" width={24} height={24} />
              <span>
                <span className="bd-ping__app">
                  EV Exec Ops <span>now</span>
                </span>
                <b>New booking request</b>
                <span>Sarah Mitchell · Manchester Airport → Lytham St Annes, Fri 21:35 · Return</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {!reduced && (
        <button type="button" className="bd__pause" onClick={() => setPaused((p) => !p)} aria-pressed={paused}>
          {paused ? "Play" : "Pause"}
        </button>
      )}
    </div>
  );
}
