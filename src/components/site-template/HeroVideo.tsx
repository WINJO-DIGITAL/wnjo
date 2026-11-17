"use client";

import { useEffect, useRef, useState } from "react";
import css from "./SiteRender.module.css";

/**
 * Silent footage behind the top of the page. It starts on its own and loops, and a visible button pauses it (a person must
 * always be able to stop moving pictures). The still photo sits underneath and shows first, and for anyone who asks for
 * reduced motion the footage never starts: the still stays and the button plays it. If the footage can't load, the still
 * is all there is and the button goes away.
 */
export function HeroVideo({ src, label = "background video" }: { src: string; label?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.muted = true;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      v.pause();
      return;
    }
    v.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  }, []);

  if (failed) return null;
  return (
    <>
      <video
        ref={ref}
        className={css.heroVideo}
        src={src}
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden="true"
        tabIndex={-1}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onError={() => setFailed(true)}
      />
      <button
        type="button"
        className={css.heroPause}
        aria-pressed={playing}
        onClick={() => {
          const v = ref.current;
          if (!v) return;
          if (v.paused) void v.play();
          else v.pause();
        }}
      >
        {playing ? `Pause ${label}` : `Play ${label}`}
      </button>
    </>
  );
}
