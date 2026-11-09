import { describe, expect, it } from "vitest";
import { EMPTY_BRIEF } from "@/lib/website-brief";
import { buildContentPrompt, parseContent } from "./website-content";
import { buildPlanPrompt, extractJson, parsePlan, PLAN_SYSTEM } from "./website-plan";

const plan = {
  summary: "A friendly bakery site.",
  tone: "Warm",
  pages: [
    { slug: "home", title: "Home", purpose: "Welcome people", sections: [{ kind: "hero", heading: "Fresh bread daily", points: ["Local", "Baked at dawn"] }, { kind: "contact", heading: "Find us", points: [] }] },
    { slug: "menu", title: "Menu", purpose: "Show what we bake", sections: [{ kind: "services", heading: "What we bake", points: [] }] },
  ],
  seo: { siteTitle: "Harbour Bakery", description: "Fresh bread in Fleetwood." },
  assumptions: ["Opening hours to be confirmed"],
  questions: ["Do you deliver?"],
};

describe("buildPlanPrompt", () => {
  const prompt = buildPlanPrompt({ businessName: "Harbour Bakery", packageName: "Core", pagesAllowed: 3, brief: { ...EMPTY_BRIEF, goals: ["bookings"], goalNote: "More orders." } });
  it("includes the brief and the page limit", () => {
    expect(prompt).toContain("Harbour Bakery");
    expect(prompt).toContain("at most 3 pages");
    expect(prompt).toContain("More orders.");
  });
  it("never offers the model anything about money or publishing", () => {
    expect(PLAN_SYSTEM).toMatch(/Never mention prices/);
    expect(prompt).not.toMatch(/£|price|invoice/i);
  });
});

describe("parsePlan", () => {
  it("accepts a valid plan, including inside a code fence", () => {
    const fenced = "Here you go:\n```json\n" + JSON.stringify(plan) + "\n```";
    const parsed = parsePlan(fenced, 5);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.plan.pages).toHaveLength(2);
  });
  it("rejects a plan with more pages than the package allows", () => {
    expect(parsePlan(JSON.stringify(plan), 1)).toEqual({ ok: false, reason: expect.stringContaining("more than the 1 pages") });
  });
  it("rejects anything that is not the plan shape", () => {
    expect(parsePlan("no json here", 5).ok).toBe(false);
    expect(parsePlan(JSON.stringify({ ...plan, pages: [] }), 5).ok).toBe(false);
    expect(parsePlan(JSON.stringify({ ...plan, summary: "" }), 5).ok).toBe(false);
    expect(parsePlan(JSON.stringify({ ...plan, pages: [plan.pages[0], plan.pages[0]] }), 5).ok).toBe(false);
  });
  it("strips HTML from every text field", () => {
    const parsed = parsePlan(JSON.stringify({ ...plan, summary: "<script>alert(1)</script>Safe summary" }), 5);
    expect(parsed.ok && parsed.plan.summary).toBe("alert(1)Safe summary");
  });
  it("turns an unknown section kind into plain text", () => {
    const odd = { ...plan, pages: [{ ...plan.pages[0], sections: [{ kind: "carousel", heading: "Hi", points: [] }] }] };
    const parsed = parsePlan(JSON.stringify(odd), 5);
    expect(parsed.ok && parsed.plan.pages[0].sections[0].kind).toBe("text");
  });
});

describe("extractJson", () => {
  it("returns null for unparseable text", () => {
    expect(extractJson("{not json")).toBeNull();
  });
});

describe("page content", () => {
  const page = plan.pages[0] as Parameters<typeof parseContent>[1];
  it("builds a prompt that carries the customer's change", () => {
    const p = buildContentPrompt({ businessName: "Harbour Bakery", brief: EMPTY_BRIEF, plan: plan as never, page, change: "Make the headline shorter" });
    expect(p).toContain("Make the headline shorter");
  });
  it("accepts good copy and removes HTML and links", () => {
    const parsed = parseContent(JSON.stringify({ headline: "Fresh bread <b>daily</b>", intro: "Visit https://evil.example now", sections: [{ heading: "Hi", body: "Hello", bullets: ["One", "<i>Two</i>"] }], cta: "Call us" }), page);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.content.headline).toBe("Fresh bread daily");
      expect(parsed.content.intro).not.toContain("http");
      expect(parsed.content.sections[0].bullets).toEqual(["One", "Two"]);
    }
  });
  it("rejects copy without a headline or sections", () => {
    expect(parseContent(JSON.stringify({ headline: "", sections: [{ heading: "A", body: "b" }] }), page).ok).toBe(false);
    expect(parseContent(JSON.stringify({ headline: "X", sections: [] }), page).ok).toBe(false);
  });
});
