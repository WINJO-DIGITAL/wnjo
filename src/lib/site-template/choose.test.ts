import { describe, expect, it } from "vitest";
import type { AiProvider } from "@/lib/ai/provider";
import { ProviderError } from "@/lib/ai/provider";
import type { WebsitePlan } from "@/lib/ai/website-plan";
import { EMPTY_PROFILE, type WebsiteBrief } from "@/lib/website-brief";
import { ALL_LOOKS, answersFromProfile, buildableSectors, buildChoicePrompt, parseChoice, pickTemplate } from "./choose";
import { SECTOR_PRESETS } from "./presets";

const plan: WebsitePlan = {
  summary: "A friendly site that gets local homeowners to ask for a quote.",
  tone: "warm and straightforward",
  pages: [{ slug: "home", title: "Home", purpose: "Win the call", sections: [] }],
  seo: { siteTitle: "t", description: "d" },
  assumptions: [],
  questions: [],
};
const brief = { goals: ["enquiries"], goalNote: "", style: null, colours: "" } as Parameters<typeof buildChoicePrompt>[0]["brief"];
const reply = (text: string, costPence = 1) => ({ kind: "final" as const, text, usage: { inputTokens: 1, outputTokens: 1, costPence } });
const scripted = (...texts: string[]): AiProvider & { calls: number } => {
  const p = { name: "x", model: "m", calls: 0, complete: async () => reply(texts[Math.min(p.calls++, texts.length - 1)]) };
  return p;
};
const input = (over: Partial<Parameters<typeof pickTemplate>[1]> = {}) => ({ businessName: "Hartley Electrical", businessType: "electrician", brief, plan, sectors: ["electrician", "plumber"], looks: ALL_LOOKS, ...over });

describe("there are eight styles, and the AI chooses between exactly those", () => {
  it("counts them", () => expect(ALL_LOOKS).toHaveLength(8));
});

describe("answers from a customer's own words", () => {
  const own = (over: Partial<WebsiteBrief["profile"]> = {}): WebsiteBrief =>
    ({ otherBusinessType: "mobile dog groomer", profile: { ...EMPTY_PROFILE, services: "Full groom £40\nNail trim £8", email: "a@b.co.uk", differentiator: "We come to you.", ...over } }) as WebsiteBrief;

  it("are not made for a customer who ticked a sector", () => {
    expect(answersFromProfile({ otherBusinessType: "", profile: EMPTY_PROFILE } as WebsiteBrief, "X")).toBeNull();
  });

  it("carry the customer's services, contact and what makes them different, and never any opening hours", () => {
    const a = answersFromProfile(own(), "Paws")!;
    expect(a).toMatchObject({ businessName: "Paws", servicesText: "Full groom £40\nNail trim £8", email: "a@b.co.uk", about: "We come to you." });
    expect(a.hours).toBeUndefined();
  });

  it("only offer sectors that can be built from them, so no hours are ever invented", () => {
    const sectors = buildableSectors(answersFromProfile(own({ areas: "Preston, Chorley" }), "Paws")!);
    expect(sectors.length).toBeGreaterThan(0);
    for (const id of sectors) {
      const hours = SECTOR_PRESETS[id].sections.find((s) => s.kind === "hours");
      expect(!hours || !hours.required).toBe(true);
    }
  });
});

describe("the choice prompt and its checks", () => {
  it("lists only the sectors and looks it may pick from", () => {
    const p = buildChoicePrompt(input({ sectors: ["electrician"] }));
    expect(p).toContain("- electrician:");
    expect(p).not.toContain("- barber:");
    expect(p).toContain("- athletic:");
    expect(p).toContain(plan.summary);
  });

  it("accepts a sector and a look from the lists, in any case or fence", () => {
    expect(parseChoice('```json\n{"sector":"Electrician","look":"ATHLETIC"}\n```', ["electrician"], ALL_LOOKS)).toEqual({ ok: true, choice: { sector: "electrician", look: "athletic" } });
  });

  it("refuses anything else, rather than repairing it", () => {
    expect(parseChoice('{"sector":"barber","look":"bold"}', ["electrician"], ALL_LOOKS).ok).toBe(false);
    expect(parseChoice('{"sector":"electrician","look":"neon"}', ["electrician"], ALL_LOOKS).ok).toBe(false);
    expect(parseChoice("I'd go with the electrician", ["electrician"], ALL_LOOKS).ok).toBe(false);
  });
});

describe("when no sector suits the business", () => {
  it("lets the model say none, only when allowed, and tells it so", () => {
    expect(parseChoice('{"sector":"none","look":"boutique"}', ["cleaning"], ALL_LOOKS, true)).toMatchObject({ ok: true, choice: { sector: "none" } });
    expect(parseChoice('{"sector":"none","look":"boutique"}', ["cleaning"], ALL_LOOKS).ok).toBe(false);
    expect(buildChoicePrompt(input({ allowNone: true }))).toContain('answer "none"');
    expect(buildChoicePrompt(input())).not.toContain('answer "none"');
  });

  it("still asks the model when it is the only sector, so it can decline it", async () => {
    const p = scripted('{"sector":"none","look":"bold"}');
    expect(await pickTemplate(p, input({ sectors: ["cleaning"], looks: ["athletic"], allowNone: true }))).toMatchObject({ ok: true, choice: { sector: "none" } });
    expect(p.calls).toBe(1);
  });
});

describe("picking the template", () => {
  it("asks the model once and uses its answer", async () => {
    const p = scripted('{"sector":"plumber","look":"boutique"}');
    expect(await pickTemplate(p, input())).toEqual({ ok: true, choice: { sector: "plumber", look: "boutique" }, costPence: 1 });
    expect(p.calls).toBe(1);
  });

  it("tries once more with the reason when the first reply is outside the lists", async () => {
    const p = scripted('{"sector":"barber","look":"boutique"}', '{"sector":"electrician","look":"heritage"}');
    const r = await pickTemplate(p, input());
    expect(r).toMatchObject({ ok: true, choice: { sector: "electrician", look: "heritage" }, costPence: 2 });
  });

  it("gives up after two bad replies, so a person decides", async () => {
    const r = await pickTemplate(scripted("no"), input());
    expect(r).toMatchObject({ ok: false, costPence: 2 });
  });

  it("makes no call when there is nothing to choose", async () => {
    const p = scripted("unused");
    expect(await pickTemplate(p, input({ sectors: ["electrician"], looks: ["athletic"] }))).toEqual({ ok: true, choice: { sector: "electrician", look: "athletic" }, costPence: 0 });
    expect(p.calls).toBe(0);
  });

  it("fails plainly when no template fits, or the service is down", async () => {
    expect((await pickTemplate(scripted("x"), input({ sectors: [] }))).ok).toBe(false);
    const down: AiProvider = { name: "x", model: "m", complete: async () => { throw new ProviderError("busy", "transient"); } };
    expect(await pickTemplate(down, input())).toMatchObject({ ok: false });
  });
});
