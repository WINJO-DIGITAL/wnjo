import { describe, expect, it } from "vitest";
import { routeFor } from "./build-journey";
import { cleanProjectRequest } from "./project-request";

const details = { name: "Ada Lovelace", businessName: "Analytical Engines Ltd", email: "ada@example.com", phone: "", industry: "", existingWebsite: "", description: "", customers: "", launchDate: "", requirements: "" };
const good = { details, goals: ["bookings"], budget: "2k-5k", timeline: "1-3m", notes: "A site for our workshop." };

describe("buy-outright request", () => {
  it("needs only name, business, email, a goal, a budget and a deadline", () => {
    const r = cleanProjectRequest(good);
    expect(r.ok).toBe(true);
  });

  it("always goes to a written proposal, never to payment", () => {
    const r = cleanProjectRequest(good);
    if (!r.ok) throw new Error("expected ok");
    expect(r.value.quote.mode).toBe("oneOff");
    expect(r.value.quote.requiresQuote).toBe(true);
    expect(routeFor(r.value.quote)).toBe("proposal");
  });

  it("keeps budget, deadline and the customer's words together in the brief note", () => {
    const r = cleanProjectRequest(good);
    if (!r.ok) throw new Error("expected ok");
    expect(r.value.brief.goalNote).toContain("Budget: £2,000 to £5,000");
    expect(r.value.brief.goalNote).toContain("Wanted by: Within 1 to 3 months");
    expect(r.value.brief.goalNote).toContain("A site for our workshop.");
  });

  it("says what is missing", () => {
    const r = cleanProjectRequest({ details: { ...details, email: "nope" }, goals: [], budget: "x", timeline: null });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(Object.keys(r.errors).sort()).toEqual(["budget", "email", "goals", "timeline"]);
  });
});

describe("buy-outright request: hosting", () => {
  it("carries the hosting plan chosen on the projects page into the brief note and the figures", () => {
    const r = cleanProjectRequest({ ...good, care: "hosting" });
    if (!r.ok) throw new Error("expected ok");
    expect(r.value.answers.care).toBe("hosting");
    expect(r.value.brief.goalNote).toContain("Hosting after launch:");
  });
  it("ignores an unknown hosting plan", () => {
    const r = cleanProjectRequest({ ...good, care: "free-everything" });
    if (!r.ok) throw new Error("expected ok");
    expect(r.value.answers.care).toBe("none");
  });
});
