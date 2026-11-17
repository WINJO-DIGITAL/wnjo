/**
 * The "Your website address" step: after a customer has seen their preview, they say whether they already have an
 * address for the new website, or want help getting one. Pure, so the rules are tested without the database.
 */
import { normaliseHostname } from "@/lib/site-template/hosts";
import type { Stage } from "@/lib/build-journey";

export const DOMAIN_CHOICES = ["have", "help"] as const;
export type DomainChoice = (typeof DOMAIN_CHOICES)[number];

/** The stages where the customer has a preview to look at, so the question makes sense. */
export const DOMAIN_STAGES: readonly Stage[] = ["preview", "changes", "approval", "live"];

export const DOMAIN_COPY = {
  heading: "Your website address",
  question: "Do you already have a web address for this business?",
  yes: "Yes, I have one",
  help: "No, help me get one",
  ask: "Type it as you would write it on a card, for example hartleyandsons.co.uk.",
} as const;

export type DomainAnswer = { choice: DomainChoice; name: string | null };

/** Checks the answer the customer sent. A ".co.uk" name is required only when they say they have one. */
export function cleanDomainAnswer(input: { choice?: unknown; name?: unknown }): { ok: true; answer: DomainAnswer } | { ok: false; reason: string } {
  const choice = DOMAIN_CHOICES.find((c) => c === input.choice);
  if (!choice) return { ok: false, reason: "Please choose one of the two options." };
  if (choice === "help") return { ok: true, answer: { choice, name: null } };
  const raw = typeof input.name === "string" ? input.name.trim() : "";
  if (!raw) return { ok: false, reason: "Please type your web address, for example hartleyandsons.co.uk." };
  const name = normaliseHostname(raw);
  if (!name) return { ok: false, reason: "That doesn't look like a web address. Try something like hartleyandsons.co.uk." };
  return { ok: true, answer: { choice, name } };
}

/** Whether the question should be asked at this stage. */
export const askDomain = (stage: Stage): boolean => DOMAIN_STAGES.includes(stage);
