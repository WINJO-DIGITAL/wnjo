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
import { GENERAL_PRESET, SECTOR_PRESETS, presetFor } from "./presets";
import type { Look } from "./schema";
import { STYLES, STYLE_INFO } from "./styles";

const LOOK_NOTES = (look: Look): string => (look in STYLE_INFO ? `${STYLE_INFO[look as keyof typeof STYLE_INFO].blurb} Tone: ${STYLE_INFO[look as keyof typeof STYLE_INFO].tone}.` : look);

const cutWords = (text: string, max: number): string => (text.length <= max ? text : text.slice(0, max).replace(/\s+\S*$/, "").trim());

/**
 * One service per line, as the template wants them. A line the customer wrote as "Airport transfers – pre-booked pickups
 * to UK airports" keeps its name, and the description is left for the writer; a line over the name limit is cut at a word.
 * A price already in the line stays with it.
 */
export function serviceLines(text: string): string {
  const seen = new Set<string>();
  const lines: string[] = [];
  for (const raw of text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)) {
    const m = raw.match(/^(.{2,60}?)\s+[–—-]\s+(.+)$/);
    const line = m && !/^[£\d]/.test(m[2]) ? m[1].trim() : cutWords(raw, 60);
    if (!line || seen.has(line.toLowerCase())) continue;
    seen.add(line.toLowerCase());
    lines.push(line);
  }
  return lines.slice(0, 12).join("\n");
}

/**
 * The answers a template needs, taken from what a customer told us when they described their own kind of business. Opening
 * hours are never guessed: a template that needs structured hours isn't a candidate for these answers, and the general
 * template shows only the hours note, in the customer's words.
 */
export function answersFromProfile(brief: WebsiteBrief, businessName: string): RawAnswers | null {
  if (!brief.otherBusinessType) return null;
  const p = brief.profile;
  const customers = p.customers === "both" ? "Individuals and businesses" : p.customers === "individuals" ? "Individuals" : p.customers === "businesses" ? "Businesses" : "";
  const details: Record<string, string> = {};
  if (customers) details.customers = customers;
  if (p.proof) details.proof = cutWords(p.proof, 200);
  if (p.hours) details["hours-note"] = cutWords(p.hours, 200);
  return {
    businessName,
    servicesText: serviceLines(p.services),
    phone: p.phone,
    email: p.email,
    about: cutWords([p.differentiator, p.about].filter(Boolean).join(" "), 400),
    areas: p.areas
      .split(/[,;\n]/)
      .map((a) => a.trim())
      .filter((a) => a && a.length <= 40)
      .slice(0, 8)
      .join(", "),
    details,
  };
}

/** The templates these answers can be built into without anything made up: each one must accept them as they are. The general template is one of them, so a business with services and an email is always buildable. */
export function buildableSectors(answers: RawAnswers): string[] {
  return [...Object.values(SECTOR_PRESETS), GENERAL_PRESET]
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
    input.sectors.includes("general") ? 'Choose a specific sector only when it is plainly the same kind of business (a taxi firm is not a cleaner, and a florist is not a café). Otherwise answer "general": it suits any business, and the style gives it its look.' : "",
    "Sectors you may choose from:",
    ...input.sectors.map((id) => `- ${id}: ${presetFor(id)?.label ?? id}. ${presetFor(id)?.voice ?? ""}`.trim()),
    "",
    "Looks you may choose from:",
    ...input.looks.map((look) => `- ${look}: ${LOOK_NOTES(look)}`),
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

/** The eight designs the AI chooses between. */
export const ALL_LOOKS: readonly Look[] = STYLES;
