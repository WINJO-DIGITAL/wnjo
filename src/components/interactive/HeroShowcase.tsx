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
 * 40rem up. The server can't know the screen, so it renders the phone deck (most visitors, and the
 * main price button), which phones show at once, even without JavaScript. Wider screens hide it and
 * hold the space until the laptop showcase mounts. Phones keep the same markup after loading, so
 * the deck isn't rebuilt.
 */
export function HeroShowcase({ items }: { items: Item[] }) {
  const size = useSyncExternalStore(
    subscribe,
    () => (window.matchMedia(phoneQuery).matches ? "phone" : "laptop"),
    () => null,
  );
  if (size === "laptop") return <ShowcaseStage items={items} />;
  return (
    <>
      <div className="hero-ssr-phone">
        <DeviceDeck items={items.filter((p) => PHONE_CLIENTS.includes(p.slug))} />
      </div>
      <div className="hero-reserve hero-ssr-wide" aria-hidden="true" />
    </>
  );
}
