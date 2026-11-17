import { describe, expect, it } from "vitest";
import type { AiProvider } from "@/lib/ai/provider";
import { ProviderError } from "@/lib/ai/provider";
import type { WebsitePlan } from "@/lib/ai/website-plan";
import { EMPTY_PROFILE, type WebsiteBrief } from "@/lib/website-brief";
import { unknownNames } from "./claims";
import { ALL_LOOKS, answersFromProfile, buildableSectors, buildChoicePrompt, parseChoice, pickTemplate, serviceLines } from "./choose";
import { GENERAL_PRESET, SECTOR_PRESETS, presetFor } from "./presets";
import { parseAnswers } from "./answers";
import { checkSite } from "./checks";
import { assembleSite, defaultCopy, tidyIntro } from "./write";

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
      const hours = presetFor(id)!.sections.find((s) => s.kind === "hours");
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

describe("the general template", () => {
  const taxi = (over: Partial<WebsiteBrief["profile"]> = {}): WebsiteBrief =>
    ({
      otherBusinessType: "Taxis",
      profile: { ...EMPTY_PROFILE, services: "Local taxi journeys – Reliable transport for everyday trips.\n\nAirport transfers – Pre-booked pickups and drop-offs to UK airports.\n\nPrivate hire – Personal transport for groups", email: "d@x.co.uk", differentiator: "Reliable, friendly local service.", hours: "24 hours", proof: "Licensed private hire operator.", customers: "both", areas: "Thornton-Cleveleys, Blackpool, Fleetwood. UK-wide transfers by arrangement.", ...over },
    }) as WebsiteBrief;

  it("is always buildable for a business with services and an email, however long its service lines are", () => {
    const sectors = buildableSectors(answersFromProfile(taxi(), "Daz'd Cabs")!);
    expect(sectors).toContain("general");
  });

  it("keeps a service's name and the customer's own description of it", () => {
    expect(serviceLines("Local taxi journeys – Reliable transport for everyday trips.\n\nAirport transfers – Pre-booked pickups")).toBe("Local taxi journeys – Reliable transport for everyday trips.\nAirport transfers – Pre-booked pickups");
    expect(serviceLines("Cut £20\nCut £20\nBeard - 10")).toBe("Cut £20\nBeard - 10");
    expect(serviceLines("x".repeat(40) + " " + "y".repeat(40)).length).toBeLessThanOrEqual(60);
  });

  it("carries the customer's hours note, proof and customers as their own words, and invents no hours", () => {
    const a = answersFromProfile(taxi(), "Daz'd Cabs")!;
    expect(a.details).toEqual({ customers: "Individuals and businesses", proof: "Licensed private hire operator.", "hours-note": "24 hours" });
    expect(a.hours).toBeUndefined();
  });

  it("builds a site that passes every check, saying only what the customer said", () => {
    const a = answersFromProfile(taxi(), "Daz'd Cabs")!;
    const parsed = parseAnswers(a, GENERAL_PRESET, { colour: "#1f3a34" });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const input = { preset: GENERAL_PRESET, facts: parsed.facts, look: "executive" as const, colour: parsed.colour };
    const site = assembleSite(input, defaultCopy(input));
    expect(checkSite(site, parsed.facts, GENERAL_PRESET).issues).toEqual([]);
    expect(site.sections.map((s) => s.kind)).toEqual(["hero", "services", "area", "enquiry", "cta"]);
  });

  it("shows the customer's own service descriptions as they wrote them", () => {
    const a = answersFromProfile(taxi(), "Daz'd Cabs")!;
    const parsed = parseAnswers(a, GENERAL_PRESET, { colour: "#1f3a34" });
    if (!parsed.ok) throw new Error("fixture");
    expect(parsed.facts.services[0]).toEqual({ name: "Local taxi journeys", description: "Reliable transport for everyday trips." });
    const input = { preset: GENERAL_PRESET, facts: parsed.facts, look: "executive" as const, colour: parsed.colour };
    const services = assembleSite(input, defaultCopy(input)).sections.find((x) => x.kind === "services");
    expect(services && services.kind === "services" && services.items[0].description).toBe("Reliable transport for everyday trips.");
  });

  it("accepts the customer's curly apostrophe: Daz’s is Daz's", () => {
    expect(unknownNames("Welcome to Daz’s Cabs and Fleetwood.", "Daz's Cabs Fleetwood")).toEqual([]);
    expect(unknownNames("Welcome to Daz's Cabs.", "Daz’s Cabs")).toEqual([]);
    expect(unknownNames("Ask for Marcus at the desk.", "Daz’s Cabs")).toEqual(["Marcus"]);
  });

  it("answers a chosen FAQs page from the customer's own facts when the writer left it empty, and passes every check", () => {
    const a = answersFromProfile(taxi(), "Daz'd Cabs")!;
    const parsed = parseAnswers(a, GENERAL_PRESET, { colour: "#1f3a34" });
    if (!parsed.ok) throw new Error("fixture");
    const pages = ["home", "services", "about", "contact", "faq"] as const;
    const input = { preset: GENERAL_PRESET, facts: parsed.facts, look: "executive" as const, colour: parsed.colour, pages: [...pages], pageLimit: 7 };
    const site = assembleSite(input, defaultCopy(input));
    const faq = site.pages?.find((p) => p.slug === "faqs" || p.slug === "faq");
    expect(faq).toBeDefined();
    expect(faq!.sections.some((x) => x.kind === "faq")).toBe(true);
    const result = checkSite(site, parsed.facts, GENERAL_PRESET, { pages: [...pages], pageLimit: 7 });
    expect(result.issues.filter((i) => i.code === "page-missing" || i.code === "faq-not-from-facts")).toEqual([]);
  });

  it("ends an intro where a thought ends, never mid-phrase", () => {
    const about = "Daz’s Cabs combines reliable, friendly local service with professional, comfortable transport, offering dependable journeys, convenient pre-bookings and a personal service customers can trust.";
    const intro = tidyIntro(about, 18, 300);
    expect(intro).toBe("Daz’s Cabs combines reliable, friendly local service with professional, comfortable transport, offering dependable journeys.");
    expect(tidyIntro("A small gym where everyone knows your name. More words here.", 18, 300)).toBe("A small gym where everyone knows your name.");
    expect(tidyIntro("", 18, 300)).toBe("");
    expect(tidyIntro("One two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen and", 18, 300)).not.toMatch(/\band\.$/);
  });

  it("refuses a licence or cover the customer never mentioned", () => {
    const a = answersFromProfile(taxi({ proof: "", differentiator: "Friendly local service." }), "Daz'd Cabs")!;
    const parsed = parseAnswers(a, GENERAL_PRESET, { colour: "#1f3a34" });
    if (!parsed.ok) throw new Error("fixture");
    const input = { preset: GENERAL_PRESET, facts: parsed.facts, look: "executive" as const, colour: parsed.colour };
    const copy = { ...defaultCopy(input), hero: { headline: "Fully licensed taxis", intro: "Insured and trusted.", cta: "Get in touch" } };
    expect(checkSite(assembleSite(input, copy), parsed.facts, GENERAL_PRESET).issues.length).toBeGreaterThan(0);
  });

  it("is never offered as a sector tile, but can be built", () => {
    expect(Object.keys(SECTOR_PRESETS)).not.toContain("general");
    expect(presetFor("general")).toBe(GENERAL_PRESET);
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
