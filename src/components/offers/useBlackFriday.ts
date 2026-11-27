"use client";

import { useEffect, useState } from "react";
import { msUntilBlackFridayEnds } from "@/lib/black-friday";

type Status = { active: boolean; msLeft: number };

// One question per page load, shared by the banner, the plan cards and the checkout.
let pending: Promise<Status> | null = null;
function ask(): Promise<Status> {
  pending ??= fetch("/api/offers/black-friday", { cache: "no-store" })
    .then((res) => (res.ok ? (res.json() as Promise<Status>) : { active: false, msLeft: 0 }))
    .catch(() => ({ active: false, msLeft: 0 }));
  return pending;
}

/**
 * Whether to show the Black Friday offer. The server's clock decides (so a wrong clock on the visitor's device can't
 * bring it back), it fails closed (nothing shows if the question fails), and an open page switches it off on time.
 * The sign-up endpoint checks again on the server, so this only ever affects what is shown.
 */
export function useBlackFriday(): boolean {
  const [active, setActive] = useState(false);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let live = true;
    void ask().then((s) => {
      if (!live) return;
      // The server said yes; the device's own clock can still only switch it off, never on.
      const on = s.active === true && msUntilBlackFridayEnds(Date.now()) > 0;
      setActive(on);
      if (on && s.msLeft > 0 && s.msLeft < 2_147_000_000) timer = setTimeout(() => setActive(false), s.msLeft);
    });
    return () => {
      live = false;
      if (timer) clearTimeout(timer);
    };
  }, []);
  return active;
}
