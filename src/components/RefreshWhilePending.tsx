"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Asks the page to check again every few seconds, a limited number of times. For a payment that is still confirming. */
export function RefreshWhilePending({ everyMs = 4000, times = 8 }: { everyMs?: number; times?: number }) {
  const router = useRouter();
  useEffect(() => {
    let count = 0;
    const id = setInterval(() => {
      count += 1;
      router.refresh();
      if (count >= times) clearInterval(id);
    }, everyMs);
    return () => clearInterval(id);
  }, [router, everyMs, times]);
  return null;
}
