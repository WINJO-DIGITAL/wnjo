"use client";

import { useEffect, useRef, type RefObject } from "react";

/**
 * A look inside the laptop: a short clip of the site being browsed (a cursor visiting real
 * buttons, clicking and scrolling through the sections), rendered from the full-page capture.
 * Muted and inline, so it can start on its own on phones. It fills the progress bar it is
 * given as it plays, and reports when it has finished.
 */
export function LivePreview({
  mp4,
  webm,
  poster,
  name,
  paused,
  progress,
  onEnded,
  onBlocked,
}: {
  mp4: string;
  webm: string;
  poster: string;
  name: string;
  paused: boolean;
  progress: RefObject<HTMLSpanElement | null>;
  onEnded: () => void;
  /** The browser refused to start it (e.g. iPhone Low Power Mode blocks videos starting on their own). */
  onBlocked: () => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (paused) video.pause();
    else
      video.play().catch((e: DOMException) => {
        if (e.name === "NotAllowedError") onBlocked();
      });
    // Only a change of paused state should start or stop the clip.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused]);

  // Keep the tab's progress bar in step with the clip.
  useEffect(() => {
    const bar = progress.current;
    let frame = 0;
    const tick = () => {
      const video = ref.current;
      if (video && bar && video.duration) {
        bar.style.transform = `scaleX(${(video.currentTime / video.duration).toFixed(4)})`;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      if (bar) bar.style.transform = "";
    };
  }, [progress]);

  return (
    <video
      ref={ref}
      className="live"
      poster={poster}
      muted
      playsInline
      preload="auto"
      onEnded={onEnded}
      aria-label={`A walkthrough of the ${name} website`}
    >
      {/* VP9 first, about a third smaller; H.264 for the browsers that can't play it. */}
      <source src={webm} type="video/webm" />
      <source src={mp4} type="video/mp4" />
    </video>
  );
}
