"use client";

import { useMemo, useState } from "react";
import { BriefWizard, type WizardApi } from "@/components/account/BriefWizard";
import { cleanProgress, progressTooLarge, type Progress } from "@/lib/brief-progress";
import { EMPTY_BRIEF } from "@/lib/website-brief";

const KEY = "e2e-wizard-progress";
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Counters = { __saves?: number; __loads?: number; __active?: number; __maxActive?: number; __sent?: unknown };

/**
 * The details form with a stand-in server, for the browser tests. "Saving" runs the same cleaner the real route does
 * and keeps the result in this browser's storage, so a page reload behaves like coming back to the account page. The
 * request is received at once and only its answer is delayed, as with a request that survives the page closing.
 * ?latency=ms delays the answer, ?failsaves=n refuses the first n saves, ?failload=n fails the first n loads.
 * It exists only when the server starts with E2E=1. It reads no database and sends nothing.
 */
export function Harness() {
  const [sent, setSent] = useState(false);
  const [shown, setShown] = useState(true);
  const api = useMemo<WizardApi>(() => {
    // This runs while the page is prepared on the server too, where there is no window: read it only inside the calls.
    const w = (typeof window === "undefined" ? {} : window) as unknown as Counters;
    const param = (k: string, d: number) => (typeof window === "undefined" ? d : Number(new URLSearchParams(window.location.search).get(k) ?? d));
    return {
      loadAllowance: async () => 5,
      loadKnown: async () => ({ email: "known@example.com", phone: "01234 567890" }),
      loadProgress: async () => {
        w.__loads = (w.__loads ?? 0) + 1;
        await wait(150);
        if (w.__loads <= param("failload", 0)) throw new Error("offline");
        const raw = window.localStorage.getItem(KEY);
        return raw ? cleanProgress(JSON.parse(raw)) : null;
      },
      saveProgress: async (progress: Progress) => {
        w.__saves = (w.__saves ?? 0) + 1;
        w.__active = (w.__active ?? 0) + 1;
        w.__maxActive = Math.max(w.__maxActive ?? 0, w.__active);
        const refuse = w.__saves <= param("failsaves", 0);
        if (!refuse && !progressTooLarge(progress)) {
          const cleaned = cleanProgress(JSON.parse(JSON.stringify(progress)));
          if (cleaned) window.localStorage.setItem(KEY, JSON.stringify(cleaned));
        }
        await wait(param("latency", 250));
        w.__active -= 1;
        return !refuse;
      },
      viewFile: async () => null,
      send: async (input) => {
        w.__sent = input;
        return { ok: true };
      },
    };
  }, []);
  if (sent) return <p role="status">Sent.</p>;
  return (
    <>
      <button type="button" id="harness-toggle" onClick={() => setShown((v) => !v)}>
        {shown ? "Hide form" : "Show form"}
      </button>
      {shown && <BriefWizard initial={EMPTY_BRIEF} name="Test Owner" businessName="Test Co" typesOn api={api} onSent={() => setSent(true)} />}
    </>
  );
}
