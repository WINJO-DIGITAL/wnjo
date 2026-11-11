"use client";

import { useState } from "react";

/**
 * The whole proposition in one switch: everything a business owner has to sort out with an ordinary website, and
 * what is left once we look after it. Each chore is a real part of the managed service (see WEBSITE_PLANS); nothing
 * here promises more than the plans do.
 */
const CHORES = [
  "Find a designer",
  "Arrange hosting",
  "Renew the SSL certificate",
  "Keep it secure",
  "Watch for downtime",
  "Fix it when it breaks",
  "Find someone to make changes",
] as const;

export function Responsibility() {
  const [ours, setOurs] = useState(true);
  return (
    <div className="resp" data-ours={ours}>
      <div className="resp__switch" role="group" aria-label="Who looks after the website">
        <button type="button" aria-pressed={!ours} onClick={() => setOurs(false)}>
          On your own
        </button>
        <button type="button" aria-pressed={ours} onClick={() => setOurs(true)}>
          With Winjo
        </button>
      </div>
      <div className="resp__board">
        <div className="resp__col">
          <p className="resp__label">Your list</p>
          <ul role="list" className="resp__list">
            {CHORES.map((chore, i) => (
              <li key={chore} style={{ "--i": i } as React.CSSProperties}>
                <span>{chore}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="resp__col resp__col--ours" aria-hidden={!ours}>
          <p className="resp__label">Our list</p>
          <ul role="list" className="resp__list">
            {CHORES.map((chore, i) => (
              <li key={chore} style={{ "--i": i } as React.CSSProperties}>
                <span>{chore.replace(/^Find a designer$/, "Design your website").replace(/^Find someone to make changes$/, "Make your changes")}</span>
              </li>
            ))}
            <li className="resp__yours">
              <span>Run your business</span>
            </li>
          </ul>
        </div>
      </div>
      <p className="visually-hidden" role="status">
        {ours
          ? "With Winjo: we design, host, secure, monitor, fix and change your website. You run your business."
          : "On your own: every one of these jobs is yours to organise."}
      </p>
    </div>
  );
}
