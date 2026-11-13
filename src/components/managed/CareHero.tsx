"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { Project } from "@/lib/projects";
import styles from "../Devices.module.css";

/**
 * The managed-websites hero picture, driven by one switch. "On your own": a real client website, stalled, with the
 * jobs waiting on its owner. "With WINJO": the same website running, with each job done. The jobs are parts of every
 * plan (hosting and SSL, security and updates, monitoring and fixes, changes); nothing here promises more than that.
 */
const JOBS = [
  { job: "SSL certificate", own: "Expires in 3 days", ours: "Renewed for you" },
  { job: "Updates", own: "4 waiting to install", ours: "Installed and checked" },
  { job: "Downtime", own: "Down since 02:14", ours: "Monitored and fixed" },
  { job: "Changes", own: "No one to ask", ours: "Made for you" },
] as const;

const subscribeMotion = (cb: () => void) => {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};

export function CareHero({ site }: { site: Pick<Project, "name" | "host" | "walkthrough"> }) {
  const [ours, setOurs] = useState(true);
  const reduced = useSyncExternalStore(
    subscribeMotion,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
  const video = useRef<HTMLVideoElement>(null);

  // With WINJO the website runs (while on screen); on your own it stalls. Never moves on its own with reduced motion.
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    if (reduced || !ours) {
      v.pause();
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) v.play().catch(() => {});
        else v.pause();
      },
      { threshold: 0.3 },
    );
    io.observe(v);
    return () => io.disconnect();
  }, [ours, reduced]);

  return (
    <div className="care-hero" data-ours={ours}>
      <div className="resp__switch" role="group" aria-label="Who looks after the website">
        <button type="button" aria-pressed={!ours} onClick={() => setOurs(false)}>
          On your own
        </button>
        <button type="button" aria-pressed={ours} onClick={() => setOurs(true)}>
          With WINJO
        </button>
      </div>

      <figure className={`${styles.browser} care-hero__frame`}>
        <div className={styles.bar} aria-hidden="true">
          <span className={styles.dots}>
            <i />
            <i />
            <i />
          </span>
          <span className={styles.url}>{site.host}</span>
        </div>
        <video
          ref={video}
          className="care-hero__video"
          poster={site.walkthrough.poster}
          muted
          loop
          playsInline
          preload="metadata"
          aria-label={`${site.name}, a website we look after`}
        >
          {/* WebM first: about a third smaller, and the browsers that can't play it fall back to MP4. */}
          <source src={site.walkthrough.webm} type="video/webm" />
          <source src={site.walkthrough.mp4} type="video/mp4" />
        </video>
      </figure>

      {/* Swipes sideways on phones; one row on larger screens. */}
      <ul role="list" className="care-hero__jobs" aria-label={ours ? "With WINJO" : "On your own"}>
        {JOBS.map((j, i) => (
          <li key={j.job} style={{ "--i": i } as React.CSSProperties}>
            <span className="care-hero__job">{j.job}</span>
            <span key={ours ? "ours" : "own"} className="care-hero__state">
              {ours ? j.ours : j.own}
            </span>
          </li>
        ))}
      </ul>

      <p className="visually-hidden" role="status">
        {ours
          ? "With WINJO: your certificate, updates, monitoring and changes are done for you."
          : "On your own: every one of these jobs is waiting on you."}
      </p>
    </div>
  );
}
