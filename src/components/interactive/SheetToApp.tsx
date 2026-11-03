"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

/*
 * The App development hero: the spreadsheet a business runs on today turns into the app
 * it could have. The same jobs, row by row, lift off the sheet and land as tidy cards on
 * a phone. It plays once when it comes into view and can be replayed. Every name, job
 * and price is an example.
 */

const JOBS = [
  { who: "Sarah Mitchell", what: "Boiler service", when: "Tue 09:00", status: "Booked", price: "£120" },
  { who: "Tom Bennett", what: "Leak repair", when: "Tue 13:30", status: "On the way", price: "£85" },
  { who: "Emma Clarke", what: "New radiator", when: "Wed 10:00", status: "Quote sent", price: "£340" },
  { who: "Daniel Reed", what: "Annual check", when: "Thu 08:30", status: "Paid", price: "£95" },
];

// The sheet's tell-tale mess: a clashing date format, a shouty note, a missing price.
const MESS = [
  ["sarah mitchell", "boiler serv.", "tue 9am", "BOOKED??", "120"],
  ["Tom Bennett ", "leak - kitchen", "13.30 tues", "on way", "85.00"],
  ["E. Clarke", "radiator (new)", "wed", "quote sent - chase!!", ""],
  ["Dan Reed", "annual", "thurs 8:30", "paid?", "95"],
];

const subscribeMotion = (cb: () => void) => {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};

/** `still` shows the finished app with no animation or Replay (for pages that already have plenty moving). */
export function SheetToApp({ still = false }: { still?: boolean }) {
  const reduced = useSyncExternalStore(
    subscribeMotion,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
  const [state, setState] = useState<"sheet" | "app">("sheet");
  const [run, setRun] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  // Start once it's properly in view; each replay bumps `run` and starts again.
  useEffect(() => {
    const el = ref.current;
    if (!el || reduced || still) return;
    let timer = 0;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        timer = window.setTimeout(() => setState("app"), 1400);
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      window.clearTimeout(timer);
    };
  }, [reduced, still, run]);

  const shown = reduced || still ? "app" : state;

  return (
    <div className="sta" ref={ref} data-state={shown}>
      <div
        className="sta__stage"
        role="img"
        aria-label="A messy spreadsheet of jobs turns into a tidy app: the same jobs as cards on a phone, each with its time, status and price."
      >
        <div className="sta__sheet" aria-hidden="true">
          <div className="sta__sheet-bar">
            <span>jobs_FINAL_v3.xlsx</span>
          </div>
          <div className="sta__grid">
            {["Customer", "Job", "When", "Status", "£"].map((h) => (
              <b key={h}>{h}</b>
            ))}
            {MESS.map((row, r) =>
              row.map((cell, c) => (
                <span
                  key={`${r}-${c}`}
                  className={c === 3 && r === 2 ? "is-flag" : c === 4 && !cell ? "is-empty" : undefined}
                  style={{ "--r": r } as React.CSSProperties}
                >
                  {cell}
                </span>
              )),
            )}
          </div>
        </div>

        <div className="app-phone sta__phone" aria-hidden="true">
          <div className="sta__screen">
            <div className="sta__top">
              <span>9:41</span>
            </div>
            <div className="sta__head">
              <b>Today&apos;s jobs</b>
              <span className="sta__add">+</span>
            </div>
            {JOBS.map((j, i) => (
              <div key={j.who} className="sta__card" style={{ "--r": i } as React.CSSProperties}>
                <span className="sta__time">{j.when.split(" ")[1]}</span>
                <span className="sta__who">
                  <b>{j.who}</b>
                  {j.what}
                </span>
                <span className="sta__side">
                  <b>{j.price}</b>
                  <i data-status={j.status}>{j.status}</i>
                </span>
              </div>
            ))}
            {/* The still version (homepage) shows the app's tab bar, filling the screen as a real app does. */}
            {still && (
              <div className="sta__tabs">
                {["Jobs", "Calendar", "Invoices"].map((t, i) => (
                  <span key={t} className={i === 0 ? "is-on" : undefined}>
                    <i />
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      {!reduced && !still && (
        <button
          type="button"
          className="sta__replay"
          onClick={() => {
            setState("sheet");
            setRun((n) => n + 1);
          }}
          disabled={shown === "sheet"}
        >
          Replay
        </button>
      )}
    </div>
  );
}
