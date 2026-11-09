import type { Stage } from "./build-journey";

/**
 * Revisions: a customer's requests for changes to their website preview. Pure rules, so the same checks run in the
 * customer route, the staff route and the tests. The database repeats the important ones (a request can't be edited,
 * a finished revision can't be reopened, a decline needs a reason).
 */

export const REVISION_STATUSES = {
  open: "Waiting",
  in_progress: "In progress",
  done: "Done",
  declined: "Not going ahead",
} as const;
export type RevisionStatus = keyof typeof REVISION_STATUSES;

export const REVISION_LIMITS = {
  /** Longest request, in characters. */
  text: 2000,
  /** Shortest request that says anything useful. */
  minText: 5,
  /** Requests waiting or in progress at once, so one customer can't bury the team. */
  openAtOnce: 5,
} as const;

/** Rounds of changes included with every website. A round is one request from the customer. */
export const REVISION_ROUNDS_INCLUDED = 2;

/** What a revision looks like when the customer or staff screens read it. */
export type RevisionRow = {
  id: string;
  brief_id: string;
  number: number;
  status: RevisionStatus;
  request: string;
  response: string;
  created_at: string;
  resolved_at: string | null;
};

const OPEN: RevisionStatus[] = ["open", "in_progress"];
export const isUnfinished = (status: RevisionStatus) => OPEN.includes(status);

/** Cleans a customer's request. It is plain text and is never rendered as HTML. */
export function cleanRevisionText(input: unknown): { ok: true; text: string } | { ok: false; reason: string } {
  const text = typeof input === "string" ? input.trim() : "";
  if (text.length < REVISION_LIMITS.minText) return { ok: false, reason: "Please say what you'd like changed." };
  if (text.length > REVISION_LIMITS.text) return { ok: false, reason: `Please keep it under ${REVISION_LIMITS.text.toLocaleString("en-GB")} characters.` };
  return { ok: true, text };
}

/** Whether a customer can ask for changes now. Returns the reason they can't, or null. */
export function requestBlocker(stage: Stage, unfinished: number, roundsUsed = 0): string | null {
  if (stage !== "preview" && stage !== "changes") return "You can ask for changes once your preview is ready.";
  if (roundsUsed >= REVISION_ROUNDS_INCLUDED) return "You've used the changes included with your website. Contact us if you'd like more.";
  if (unfinished >= REVISION_LIMITS.openAtOnce) return "We're still working on your earlier changes. Please wait until some are done.";
  return null;
}

/** Whether a customer can approve their preview now. Returns the reason they can't, or null. */
export function approveBlocker(stage: Stage, unfinished: number): string | null {
  if (stage !== "preview") return "You can approve your website once your preview is ready.";
  if (unfinished > 0) return "There are changes still being made. You can approve once they are done.";
  return null;
}

export type RevisionOp = "start" | "done" | "decline";

/** The status a revision moves to, or why it can't. A decline needs a reason the customer can read. */
export function revisionTransition(
  current: RevisionStatus,
  op: RevisionOp,
  note: string,
): { ok: true; to: RevisionStatus } | { ok: false; reason: string; kind: "note" | "state" } {
  if (op === "start") {
    return current === "open" ? { ok: true, to: "in_progress" } : { ok: false, reason: "Only a waiting change can be started.", kind: "state" };
  }
  if (!isUnfinished(current)) return { ok: false, reason: "That change is already finished.", kind: "state" };
  if (op === "decline" && !note.trim()) return { ok: false, reason: "Say why, so the customer knows.", kind: "note" };
  return { ok: true, to: op === "done" ? "done" : "declined" };
}

/** After a change is finished: back to the customer's review once nothing is left to do, otherwise stay put. */
export function stageAfterResolve(stage: Stage, stillUnfinished: number): Stage | null {
  return stage === "changes" && stillUnfinished === 0 ? "preview" : null;
}
