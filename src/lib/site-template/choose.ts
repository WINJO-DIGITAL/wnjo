/**
 * Choosing the template for a website. A template is one of eleven sectors in one of four looks: 44 in all. After the
 * AI has planned a customer's website, it picks the sector and the look that fit the plan best, from the lists below
 * and nothing else. A sector the customer ticked themselves is never overruled, and a look they chose is kept.
 * Pure apart from the one model call, so the prompt and the checks on the reply are tested without a model.
 */
import { ProviderError, type AiProvider } from "@/lib/ai/provider";
import { extractJson, type WebsitePlan } from "@/lib/ai/website-plan";
import { GOALS, type WebsiteBrief } from "@/lib/website-brief";
import { parseAnswers, type RawAnswers } from "./answers";
import { SECTOR_PRESETS } from "./presets";
import { LOOKS, type Look } from "./schema";

const LOOK_NOTES: Record<Look, string> = {
  minimal: "clean and quiet, lots of white space",
  warm: "friendly and welcoming, softer colours",
  bold: "strong and confident, high contrast",
  classic: "traditional and trustworthy, understated",
};

/**
 * The answers a template needs, taken from what a customer told us when they typed their own kind of business. Hours are
 * never guessed: a template that needs structured opening hours simply isn't a candidate for these answers.
 */
export function answersFromProfile(brief: WebsiteBrief, businessName: string): RawAnswers | null {
  if (!brief.otherBusinessType) return null;
  const p = brief.profile;
  return {
    businessName,
    servicesText: p.services,
    phone: p.phone,
    email: p.email,
    about: p.differentiator,
    areas: p.areas,
  };
}

/** The sectors these answers can be built into without anything made up: each one must accept them as they are. */
export function buildableSectors(answers: RawAnswers): string[] {
  return Object.values(SECTOR_PRESETS)
    .filter((preset) => parseAnswers(answers, preset, { colour: "#1f3a34" }).ok)
    .map((preset) => preset.id);
}

export type ChoiceInput = {
  businessName: string;
  /** The customer's own words for their business, or the label of the sector they ticked. */
  businessType: string;
  brief: Pick<WebsiteBrief, "goals" | "goalNote" | "style" | "colours">;
  plan: WebsitePlan;
  /** The sectors the model may pick from. */
  sectors: string[];
  /** The looks the model may pick from. */
  looks: readonly Look[];
};

export const CHOICE_SYSTEM =
  "You are a senior web designer at WINJO DIGITAL, a UK web design agency. You choose which of our website templates " +
  "suits a customer's plan best. Pick only from the lists you are given. Reply with one JSON object and nothing else.";

export function buildChoicePrompt(input: ChoiceInput): string {
  const goals = input.brief.goals.map((g) => GOALS[g]?.label ?? g).join(", ") || "Not stated";
  return [
    `Business: ${input.businessName}`,
    `Kind of business: ${input.businessType}`,
    `Goals: ${goals}`,
    input.brief.goalNote ? `About the goal: ${input.brief.goalNote}` : "",
    input.brief.style ? `Look they asked for: ${input.brief.style}` : "",
    input.brief.colours ? `Colours they asked for: ${input.brief.colours}` : "",
    `The plan: ${input.plan.summary}`,
    `Tone: ${input.plan.tone}`,
    `Pages: ${input.plan.pages.map((p) => p.title).join(", ")}`,
    "",
    "Sectors you may choose from:",
    ...input.sectors.map((id) => `- ${id}: ${SECTOR_PRESETS[id]?.label ?? id}. ${SECTOR_PRESETS[id]?.voice ?? ""}`.trim()),
    "",
    "Looks you may choose from:",
    ...input.looks.map((look) => `- ${look}: ${LOOK_NOTES[look]}`),
    "",
    'Reply with JSON in exactly this shape: {"sector": string, "look": string}',
  ]
    .filter((line, i, all) => line !== "" || all[i - 1] !== "")
    .join("\n");
}

export type Choice = { sector: string; look: Look };

/** Checks a model reply. Strict: anything outside the lists is rejected, never repaired. */
export function parseChoice(text: string, sectors: string[], looks: readonly Look[]): { ok: true; choice: Choice } | { ok: false; reason: string } {
  const raw = extractJson(text) as Record<string, unknown> | null;
  if (!raw || typeof raw !== "object") return { ok: false, reason: "The reply was not JSON." };
  const sector = typeof raw.sector === "string" ? raw.sector.trim().toLowerCase() : "";
  const look = typeof raw.look === "string" ? raw.look.trim().toLowerCase() : "";
  if (!sectors.includes(sector)) return { ok: false, reason: `"${sector}" is not one of the sectors offered.` };
  if (!(looks as readonly string[]).includes(look)) return { ok: false, reason: `"${look}" is not one of the looks offered.` };
  return { ok: true, choice: { sector, look: look as Look } };
}

export type ChoiceResult = { ok: true; choice: Choice; costPence: number } | { ok: false; reason: string; costPence: number };

/**
 * One cheap model call. A reply outside the lists gets one more try with the reason it was rejected, then fails, so a
 * person decides. A single sector and a single look need no call: there is nothing to choose.
 */
export async function pickTemplate(provider: AiProvider, input: ChoiceInput): Promise<ChoiceResult> {
  if (input.sectors.length === 0) return { ok: false, reason: "No template fits these answers.", costPence: 0 };
  if (input.sectors.length === 1 && input.looks.length === 1) return { ok: true, choice: { sector: input.sectors[0], look: input.looks[0] }, costPence: 0 };
  const prompt = buildChoicePrompt(input);
  let next = prompt;
  let costPence = 0;
  for (let attempt = 0; attempt < 2; attempt++) {
    let reply;
    try {
      reply = await provider.complete({ system: CHOICE_SYSTEM, messages: [{ role: "user", content: next }], tools: [] });
    } catch (error) {
      if (error instanceof ProviderError) return { ok: false, reason: "The AI service couldn't choose a template just now.", costPence };
      throw error;
    }
    costPence += reply.usage.costPence;
    if (reply.kind !== "final") return { ok: false, reason: "The AI service asked for a tool, which this step does not use.", costPence };
    const parsed = parseChoice(reply.text, input.sectors, input.looks);
    if (parsed.ok) return { ok: true, choice: parsed.choice, costPence };
    next = `${prompt}\n\nYour last reply was rejected: ${parsed.reason} Reply again with only the JSON.`;
  }
  return { ok: false, reason: "The AI could not settle on a template.", costPence };
}

export const ALL_LOOKS: readonly Look[] = LOOKS;
