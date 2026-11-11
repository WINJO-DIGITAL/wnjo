"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { WEBSITE_PLANS, formatGBP } from "@/lib/pricing";
import { projectBySlug } from "@/lib/projects";
import devices from "../Devices.module.css";
import styles from "./ProcessScroll.module.css";

/*
 * How it works, as one pinned screen. The page holds still while the four steps play in turn, driven by scroll:
 * sticky notes land, the proposal fills in, a real website builds from the top down, then goes live.
 * Without JavaScript, or for visitors who prefer reduced motion, the four steps simply stack and are all visible.
 * The example site is EV Exec, a real client site (its screenshots are the live site's).
 */

const evexec = projectBySlug("ev-exec")!;
const plan = WEBSITE_PLANS.silver;

const STEPS = [
  { id: "enquire", title: "Tell us", line: "Your business and what you need." },
  { id: "scope", title: "Proposal", line: "Your plan and price, in writing." },
  { id: "build", title: "Build", line: "Designed and built with you." },
  { id: "launch", title: "Launch", line: "Live, and looked after from then on." },
] as const;

const clamp = (n: number) => Math.min(1, Math.max(0, n));

function Browser({ children, host }: { children: React.ReactNode; host: string }) {
  return (
    <figure className={devices.browser}>
      <div className={devices.bar} aria-hidden="true">
        <span className={devices.dots}>
          <i />
          <i />
          <i />
        </span>
        <span className={devices.url}>{host}</span>
      </div>
      {children}
    </figure>
  );
}

function Visual({ id }: { id: (typeof STEPS)[number]["id"] }) {
  if (id === "enquire")
    return (
      <div className={styles.notes}>
        <span style={{ rotate: "-3deg" }}>Our site breaks on phones</span>
        <span style={{ rotate: "2deg" }}>Enquiries go nowhere</span>
        <span style={{ rotate: "-2deg" }}>Nobody finds us on Google</span>
      </div>
    );

  if (id === "scope")
    return (
      <div className={styles.quote}>
        <div className={styles.quoteHead}>
          <b>Proposal</b>
          <span>EV Exec</span>
        </div>
        <span className={styles.row}>
          {plan.name} <b>{formatGBP(plan.monthly)}/month</b>
        </span>
        <span className={styles.row}>
          Hosting and care <b>Included</b>
        </span>
        <span className={styles.row}>
          Minimum term <b>None</b>
        </span>
        <span className={`${styles.row} ${styles.total}`}>
          First payment <b>{formatGBP(plan.setup + plan.monthly)}</b>
        </span>
        <span className={styles.stamp}>In writing</span>
      </div>
    );

  if (id === "build")
    return (
      <div className={styles.build}>
        <div className={styles.wideOnly}>
          <Browser host={`preview.${evexec.host}`}>
            <div className={styles.reveal}>
              <Image
                src={evexec.desktop}
                alt=""
                sizes="(min-width: 56rem) 40rem, 90vw"
                placeholder="blur"
                className={devices.screen}
              />
            </div>
          </Browser>
        </div>
        <figure className={`${devices.phone} ${styles.phone} ${styles.narrowOnly}`}>
          <div className={styles.reveal}>
            <Image src={evexec.mobile} alt="" sizes="14rem" placeholder="blur" className={devices.screen} />
          </div>
        </figure>
        <span className={styles.comment}>Warmer photo?</span>
      </div>
    );

  return (
    <div className={styles.launch}>
      <div className={styles.wideOnly}>
        <Browser host={evexec.host}>
          <Image
            src={evexec.desktop}
            alt=""
            sizes="(min-width: 56rem) 40rem, 90vw"
            placeholder="blur"
            className={devices.screen}
          />
        </Browser>
      </div>
      <figure className={`${devices.phone} ${styles.phone} ${styles.launchPhone}`}>
        <Image src={evexec.mobile} alt="" sizes="14rem" placeholder="blur" className={devices.screen} />
      </figure>
      <span className={styles.live}>You&apos;re live</span>
      <ul role="list" className={styles.status}>
        <li>Hosting</li>
        <li>SSL</li>
        <li>Monitoring</li>
      </ul>
    </div>
  );
}

export function ProcessScroll() {
  const wrap = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    let current = 0;
    const update = () => {
      frame = 0;
      const total = el.offsetHeight - window.innerHeight;
      if (total <= 0) return;
      const p = clamp(-el.getBoundingClientRect().top / total);
      const raw = p * STEPS.length;
      const next = Math.min(STEPS.length - 1, Math.floor(raw));
      for (let i = 0; i < STEPS.length; i++) {
        el.style.setProperty(`--p${i}`, String(clamp(raw - i)));
      }
      if (next !== current) {
        current = next;
        setStep(next);
      }
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  const jump = (i: number) => {
    const el = wrap.current;
    if (!el) return;
    const total = el.offsetHeight - window.innerHeight;
    const top = el.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: top + total * ((i + 0.55) / STEPS.length), behavior: "smooth" });
  };

  return (
    <div ref={wrap} className={styles.wrap} data-cta-hide>
      <div className={styles.stage}>
        <div className={styles.tabs} role="tablist" aria-label="Steps">
          {STEPS.map((s, i) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={step === i}
              className={styles.tab}
              style={{ "--f": `var(--p${i}, 1)` } as React.CSSProperties}
              onClick={() => jump(i)}
            >
              {s.title}
            </button>
          ))}
        </div>
        <ol role="list" className={styles.panels}>
          {STEPS.map((s, i) => (
            <li
              key={s.id}
              className={styles.panel}
              data-id={s.id}
              data-active={step === i}
              style={{ "--pp": `var(--p${i}, 1)` } as React.CSSProperties}
            >
              <div className={styles.visual} aria-hidden="true">
                <Visual id={s.id} />
              </div>
              <div className={styles.caption}>
                <h3>{s.title}</h3>
                <p>{s.line}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
