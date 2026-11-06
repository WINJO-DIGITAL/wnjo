"use client";

import { useSyncExternalStore } from "react";
import type { Project } from "@/lib/projects";
import { DeviceDeck } from "./DeviceDeck";
import { ShowcaseStage } from "./ShowcaseStage";

type Item = Pick<
  Project,
  "slug" | "name" | "sector" | "host" | "url" | "desktop" | "mobile" | "tablet" | "walkthrough" | "logo"
>;

/** The phone hero shows these three clients; the laptop showcase keeps the full set. */
const PHONE_CLIENTS = ["ev-exec", "boonma", "raeng-fitness"];

const phoneQuery = "(max-width: 39.99rem)";
const subscribe = (onChange: () => void) => {
  const mq = window.matchMedia(phoneQuery);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
};

/**
 * The homepage's work showcase: the swipeable device deck on phones (below 40rem), the laptop from
 * 40rem up. Only one is mounted, so each screen downloads only its own images. The server can't
 * know the screen, so it renders a sized placeholder and the right one mounts on hydration.
 */
export function HeroShowcase({ items }: { items: Item[] }) {
  const size = useSyncExternalStore(
    subscribe,
    () => (window.matchMedia(phoneQuery).matches ? "phone" : "laptop"),
    () => null,
  );
  if (size === "phone") return <DeviceDeck items={items.filter((p) => PHONE_CLIENTS.includes(p.slug))} />;
  if (size === "laptop") return <ShowcaseStage items={items} />;
  return <div className="hero-reserve" aria-hidden="true" />;
}
