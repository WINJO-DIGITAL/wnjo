/**
 * A customer's request to cancel a website plan, made on their account. Pure (no network, no database), so the route and
 * the tests share the same rules. The customer picks a reason from a short list and may add a line of their own; both
 * are optional, and nothing here makes it harder to ask.
 */

export const CANCEL_REASONS = {
  too_expensive: "It costs too much",
  not_using: "I'm not using it",
  switching: "I'm moving to another provider",
  closing: "My business is closing",
  other: "Something else",
} as const;
export type CancelReason = keyof typeof CANCEL_REASONS;

export const CANCEL_COMMENT_MAX = 300;

export type CancelRequestInput = { reason: CancelReason | ""; comment: string };

/** Cleans what the form sends. Anything unknown becomes empty; a request with no reason is still a valid request. */
export function cleanCancelRequest(input: unknown): CancelRequestInput {
  const o = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const reason = typeof o.reason === "string" && o.reason in CANCEL_REASONS ? (o.reason as CancelReason) : "";
  const comment =
    typeof o.comment === "string"
      ? o.comment
          .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
          .replace(/<[^>]*>/g, "")
          .trim()
          .slice(0, CANCEL_COMMENT_MAX)
      : "";
  return { reason, comment };
}

/** The reason as one line, for staff and the log. */
export function describeCancelRequest(r: CancelRequestInput): string {
  return [r.reason ? CANCEL_REASONS[r.reason] : "", r.comment].filter(Boolean).join(" · ");
}

/** Only a running monthly plan can be asked to cancel, and only once at a time. */
export function canRequestCancel(sub: { kind: string; status: string; cancel_at_period_end?: boolean | null }): boolean {
  return sub.kind === "subscription" && (sub.status === "active" || sub.status === "past_due") && sub.cancel_at_period_end !== true;
}
