"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { Project } from "@/lib/projects";
import styles from "../Devices.module.css";
import { ArrowRight } from "../Icons";

/** A project's own walkthrough clip in a browser window; the visitor switches between projects. */
export type ClipItem = Pick<Project, "slug" | "name" | "host" | "walkthrough"> & { what: string; href: string };

const subscribeMotion = (cb: () => void) => {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};

export function ClipShowcase({ items }: { items: ClipItem[] }) {
  const reduced = useSyncExternalStore(
    subscribeMotion,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
  const [index, setIndex] = useState(0);
  const video = useRef<HTMLVideoElement>(null);
  const current = items[index];

  // Plays only while on screen (and never on its own with reduced motion).
  useEffect(() => {
    const v = video.current;
    if (!v || reduced) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) v.play().catch(() => {});
        else v.pause();
      },
      { threshold: 0.4 },
    );
    io.observe(v);
    return () => io.disconnect();
  }, [reduced, index]);

  return (
    <div className="clips">
      <div className="clips__tabs" role="group" aria-label="Choose a project">
        {items.map((it, i) => (
          <button key={it.slug} type="button" aria-pressed={i === index} onClick={() => setIndex(i)}>
            {it.name}
          </button>
        ))}
      </div>
      <figure className={`${styles.browser} clips__frame`}>
        <div className={styles.bar} aria-hidden="true">
          <span className={styles.dots}>
            <i />
            <i />
            <i />
          </span>
          <span className={styles.url}>{current.host}</span>
        </div>
        <video
          key={current.slug}
          ref={video}
          className="clips__video"
          poster={current.walkthrough.poster}
          muted
          loop
          playsInline
          preload="metadata"
          controls={reduced}
          aria-label={`A walkthrough of ${current.name}`}
        >
          {/* WebM first: about a third smaller, and the browsers that can't play it fall back to MP4. */}
          <source src={current.walkthrough.webm} type="video/webm" />
          <source src={current.walkthrough.mp4} type="video/mp4" />
        </video>
      </figure>
      <p className="clips__caption" aria-live="polite">
        {current.what} ·{" "}
        <Link href={current.href} className="arrow-link">
          See it <ArrowRight />
        </Link>
      </p>
    </div>
  );
}
