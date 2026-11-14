"use client";

import { useCallback, useRef, useState } from "react";
import type { FieldErrors } from "@/lib/enquiry";

export type SubmitState =
  | { status: "idle" }
  | { status: "submitting" }
  | {
      status: "success";
      reference?: string;
      quoteReference?: string;
      route?: "package" | "proposal" | null;
      tracked?: boolean;
      /** Where to send the customer to pay, when they chose to pay straight from their quote. */
      pay?: { url: string } | null;
      /** A payment was set up (even if the Stripe page couldn't be opened, so a link was emailed). */
      paymentStarted?: boolean;
      /** For a buy-outright request: the brief and a pass to answer its questions on the same page. */
      briefId?: string;
      pass?: string;
    }
  | { status: "not_configured"; message: string }
  | { status: "error"; message: string; fields?: FieldErrors };

/** Posts to /api/enquiry and reports what actually happened; success is only shown on a 2xx. */
export function useEnquirySubmit() {
  const [state, setState] = useState<SubmitState>({ status: "idle" });
  const busy = useRef(false);

  /** Resolves with the outcome. A second call while one is in flight is ignored, so double clicks can't send twice. */
  const submit = useCallback(async (payload: Record<string, unknown>): Promise<SubmitState | null> => {
    if (busy.current) return null;
    busy.current = true;
    const settle = (next: SubmitState) => {
      setState(next);
      busy.current = false;
      return next;
    };
    setState({ status: "submitting" });
    try {
      const res = await fetch("/api/enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        code?: string;
        reference?: string;
        quoteReference?: string;
        route?: "package" | "proposal" | null;
        tracked?: boolean;
        pay?: { url?: unknown } | null;
        paymentStarted?: boolean;
        briefId?: string;
        pass?: string;
        fields?: FieldErrors;
      };
      if (res.ok) return settle({
          status: "success",
          reference: data.reference,
          quoteReference: data.quoteReference,
          route: data.route,
          tracked: data.tracked,
          pay: data.pay && typeof data.pay.url === "string" ? { url: data.pay.url } : null,
          paymentStarted: data.paymentStarted === true,
          briefId: typeof data.briefId === "string" ? data.briefId : undefined,
          pass: typeof data.pass === "string" ? data.pass : undefined,
        });
      if (data.code === "not_configured") {
        return settle({ status: "not_configured", message: data.error ?? "Online enquiries aren't connected yet." });
      }
      return settle({
        status: "error",
        message: data.error ?? "Something went wrong. Please try again.",
        fields: data.fields,
      });
    } catch {
      return settle({ status: "error", message: "We couldn't reach the server. Check your connection and try again." });
    }
  }, []);

  return { state, submit, reset: () => setState({ status: "idle" }) };
}
