"use client";

import { useState } from "react";

/*
 * Build your app: tap features on and off and the phone assembles itself, each one adding
 * its own piece of screen and its own tab. Names, times and figures are examples.
 */

const MODULES = [
  { id: "bookings", label: "Bookings", tab: "Book" },
  { id: "payments", label: "Payments", tab: "Pay" },
  { id: "accounts", label: "Customer accounts", tab: "Account" },
  { id: "alerts", label: "Notifications", tab: "Inbox" },
  { id: "reports", label: "Reports", tab: "Reports" },
  { id: "team", label: "Team access", tab: "Team" },
] as const;
type Module = (typeof MODULES)[number]["id"];

const BARS = [42, 58, 50, 72, 64, 86, 78];

export function AppBuilder() {
  const [on, setOn] = useState<Set<Module>>(() => new Set(["bookings", "payments"]));
  const toggle = (id: Module) =>
    setOn((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const has = (id: Module) => on.has(id);
  const tabs = MODULES.filter((m) => on.has(m.id)).slice(0, 5);

  return (
    <div className="ab">
      <div className="ab__controls">
        <p className="studio__legend" id="ab-legend">
          Features <span>{on.size} of 6</span>
        </p>
        <div className="studio__chips ab__chips" role="group" aria-labelledby="ab-legend">
          {MODULES.map((m) => (
            <button key={m.id} type="button" aria-pressed={has(m.id)} onClick={() => toggle(m.id)}>
              {has(m.id) ? "✓ " : "+ "}
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="app-phone ab__phone" aria-hidden="true">
        <div className="ab__screen">
          <div
            className="st-ui"
            data-style="soft"
            style={{ "--a": "#56624a", "--on-a": "#ffffff" } as React.CSSProperties}
          >
            <div className="st-status">
              <span>9:41</span>
              <span className="st-status__icons" />
            </div>

            {has("alerts") && (
              <div className="ab-ping">
                <b>New booking</b> Sarah Mitchell, Tue 09:00
              </div>
            )}

            <div className="st-head">
              {has("accounts") ? <span className="st-logo">S</span> : <span className="st-logo">Y</span>}
              <span className="st-name">{has("accounts") ? "Hi, Sarah" : "Your App"}</span>
              <span className="st-menu" />
            </div>

            <div className="st-body ab__body">
              {on.size === 0 && <p className="ab-empty">Tap a feature to start building.</p>}

              {has("bookings") && (
                <div className="ab-block" key="bookings">
                  <p className="st-kicker">This week</p>
                  <div className="st-days">
                    {["Mon 12", "Tue 13", "Wed 14", "Thu 15", "Fri 16"].map((d, i) => (
                      <span key={d} className={i === 1 ? "is-on" : undefined}>
                        {d.split(" ")[0]}
                        <b>{d.split(" ")[1]}</b>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {has("reports") && (
                <div className="ab-block st-line st-line--box ab-chart" key="reports">
                  <span>
                    <small>This month</small>
                    <b>£4,820</b>
                  </span>
                  <span className="ab-bars">
                    {BARS.map((h, i) => (
                      <i key={i} style={{ height: `${h}%` }} />
                    ))}
                  </span>
                </div>
              )}

              {has("team") && (
                <div className="ab-block ab-team" key="team">
                  {["T", "E", "D"].map((t) => (
                    <i key={t}>{t}</i>
                  ))}
                  <span>3 on shift</span>
                </div>
              )}

              {has("payments") && (
                <div className="ab-block" key="payments">
                  <div className="st-line st-line--box">
                    <span>
                      <b>Boiler service</b> <small>Tue 09:00</small>
                    </span>
                    <b>£120</b>
                  </div>
                  <span className="st-btn">Pay £120 securely</span>
                </div>
              )}
            </div>

            {tabs.length > 0 && (
              <div className="st-tabs" style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}>
                {tabs.map((t, i) => (
                  <span key={t.id} className={i === 0 ? "is-on" : undefined}>
                    <i />
                    {t.tab}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
