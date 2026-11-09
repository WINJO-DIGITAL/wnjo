/**
 * The customer portal shows a website's progress as four plain steps, with the full twelve-stage path one tap away.
 * Pure, so the mapping and the "what do I do next" wording are tested.
 */
import type { Route, Stage } from "./build-journey";

export const PORTAL_STEPS = [
  { id: "brief", label: "Brief" },
  { id: "payment", label: "Payment" },
  { id: "build", label: "Build" },
  { id: "launch", label: "Review and launch" },
] as const;

const STEP_OF: Partial<Record<Stage, number>> = {
  brief_received: 0,
  reviewing: 0,
  proposal: 0,
  awaiting_payment: 1,
  specification: 2,
  building: 2,
  preview: 3,
  changes: 3,
  approval: 3,
};

/**
 * Which of the four steps a website is on (0 to 3), or 4 once it is live. A website that is on hold or closed keeps
 * the step it had reached, passed in as `lastOnPath`.
 */
export function portalStepIndex(stage: Stage, lastOnPath?: Stage | null): number {
  if (stage === "live") return PORTAL_STEPS.length;
  const direct = STEP_OF[stage];
  if (direct !== undefined) return direct;
  return (lastOnPath && STEP_OF[lastOnPath]) ?? 0;
}

export type NextStep = {
  title: string;
  body: string;
  /** True when the customer has something to do. Drives the emphasis, never the wording. */
  action: boolean;
  /** Which tab holds the thing to do. */
  tab: "overview" | "changes" | null;
  cta: string | null;
};

/** The one card at the top of a website: what happens next, and whether it is on the customer. */
export function nextStepFor(input: { stage: Stage; route: Route; proposalSent: boolean }): NextStep {
  const { stage, route, proposalSent } = input;
  if (proposalSent) {
    return { title: "Review your proposal", body: "Accepting doesn't charge you.", action: true, tab: "overview", cta: "Review proposal" };
  }
  switch (stage) {
    case "awaiting_payment":
      return route === "proposal"
        ? { title: "Pay your deposit", body: "Then we start your build.", action: true, tab: "overview", cta: "Pay now" }
        : { title: "Complete your payment", body: "Use the secure link we emailed you.", action: true, tab: null, cta: null };
    case "preview":
      return { title: "Your preview is ready", body: "Look it over and tell us what to change.", action: true, tab: "changes", cta: "Review preview" };
    case "live":
      return { title: "Your website is live", body: "Thank you for choosing WINJO DIGITAL.", action: false, tab: null, cta: null };
    case "on_hold":
      return { title: "On hold", body: "We'll be in touch.", action: false, tab: null, cta: null };
    case "closed":
      return { title: "This brief is closed", body: "Get in touch if that's a surprise.", action: false, tab: null, cta: null };
    case "changes":
      return { title: "Making your changes", body: "Nothing needed from you.", action: false, tab: null, cta: null };
    case "approval":
      return { title: "Final checks", body: "Our team is checking before launch.", action: false, tab: null, cta: null };
    case "specification":
    case "building":
      return { title: "We're building your website", body: "Nothing needed from you.", action: false, tab: null, cta: null };
    default:
      return { title: "We're on it", body: "Nothing needed from you.", action: false, tab: null, cta: null };
  }
}
