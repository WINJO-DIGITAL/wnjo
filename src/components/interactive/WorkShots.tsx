"use client";

import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";

/** One picture of a website. `top` is how far down the picture the crop starts, from 0 (the top) to 100 (the bottom). */
export type WorkShot = { src: StaticImageData; top: number };

/**
 * A few pictures of one website in a row you swipe sideways: the opening screen first, then two further sections of the
 * same site. It is plain scrolling with snap points, so it works with a finger, a trackpad or the arrow keys, and the
 * short bars underneath show where you are and let a mouse jump between pictures. The pictures repeat the "View project"
 * link beside them, so they are hidden from keyboards and screen readers; only the bars are reachable.
 */
export function WorkShots({ name, href, shots, sizes }: { name: string; href: string; shots: WorkShot[]; sizes: string }) {
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  const sync = () => {
    const el = track.current;
    if (el && el.clientWidth) setIndex(Math.round(el.scrollLeft / el.clientWidth));
  };
  const show = (i: number) => {
    const el = track.current;
    if (!el) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ left: i * el.clientWidth, behavior: still ? "auto" : "smooth" });
  };

  return (
    <div className="work-tile__media work-shots">
      <div ref={track} className="work-shots__track" onScroll={sync}>
        {shots.map((s, i) => (
          <Link key={i} href={href} className="work-shots__slide" tabIndex={-1} aria-hidden="true">
            <Image src={s.src} alt="" sizes={sizes} placeholder="blur" className="work-tile__shot" style={{ objectPosition: `50% ${s.top}%` }} />
          </Link>
        ))}
      </div>
      {shots.length > 1 && (
        <div className="work-shots__pager" role="group" aria-label={`Pictures of the ${name} website`}>
          {shots.map((_, i) => (
            <button key={i} type="button" aria-label={`Show picture ${i + 1} of ${shots.length}`} aria-current={i === index ? "true" : undefined} onClick={() => show(i)} />
          ))}
        </div>
      )}
    </div>
  );
}
