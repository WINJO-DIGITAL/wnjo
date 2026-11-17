import { describe, expect, it } from "vitest";
import { EMPTY_BRIEF, cleanBrief } from "./website-brief";
import { buildHandoffBrief } from "./website-handoff";

const dazBrief = cleanBrief({
  goals: ["enquiries", "local", "trust"],
  goalNote: "More local airport runs.",
  pages: ["Home", "About", "Services", "Contact", "FAQs"],
  style: "luxury",
  colours: "Black and gold",
  avoid: "Stock photos of other people's cars",
  otherBusinessType: "Taxis",
  profile: {
    services: "Local taxi journeys – Reliable transport for everyday trips.\nAirport transfers – Pre-booked pickups and drop-offs to UK airports.",
    phone: "07474144600",
    email: "daz@example.co.uk",
    differentiator: "Reliable, friendly local service.",
    customers: "both",
    areas: "Blackpool, Fleetwood",
    firstActions: ["call", "book"],
    hours: "24 hours",
    proof: "Licensed private hire operator.",
    about: "A local taxi firm.",
    tone: "professional",
  },
});
const input = {
  reference: "WNJO-F98BE7",
  businessName: "Daz’s Cabs",
  contactName: "Nitisat Sirisom",
  email: "customer@example.co.uk",
  plan: "Core",
  sentOn: "17/11/2026",
  brief: dazBrief,
  files: [{ name: "logo.png", type: "image/png", size: 2_077_566, role: "logo" as const, url: "https://files.example/logo" }],
  adminUrl: "https://winjodigital.co.uk/admin#builds",
};

describe("the brief for a website the owner builds by hand", () => {
  const md = buildHandoffBrief(input);

  it("opens with the business, the reference and who the customer is", () => {
    expect(md).toMatch(/^# Website brief: Daz’s Cabs/);
    expect(md).toContain("WNJO-F98BE7");
    expect(md).toContain("customer@example.co.uk");
    expect(md).toContain("goals sent 17/11/2026");
  });

  it("carries everything the customer said, in their own words", () => {
    for (const fact of ["Taxis", "07474144600", "daz@example.co.uk", "Blackpool, Fleetwood", "24 hours", "Licensed private hire operator.", "Reliable, friendly local service.", "More local airport runs.", "Black and gold", "Stock photos of other people's cars"]) {
      expect(md).toContain(fact);
    }
    expect(md).toContain("- Local taxi journeys – Reliable transport for everyday trips.");
    expect(md).toContain("More enquiries, Be found locally, Look established");
    expect(md).toContain("Home, About, Services, Contact, FAQs");
    expect(md).toContain("Premium and refined");
  });

  it("states the rules that keep a hand-built site honest, and points at the owner's own sites", () => {
    expect(md).toMatch(/Never invent prices, opening hours, testimonials/);
    expect(md).toMatch(/Don't crop, recolour or redraw a logo/);
    for (const repo of ["raengfitness", "duratek", "Boonma", "evexec"]) expect(md).toContain(repo);
  });

  it("lists the files by what they are, with their links", () => {
    expect(md).toContain("**Logo:** logo.png (2.0 MB): https://files.example/logo");
  });

  it("says plainly when there are no files, and leaves out what wasn't given", () => {
    const bare = buildHandoffBrief({ ...input, files: [], brief: { ...EMPTY_BRIEF, goals: ["enquiries"], pages: ["Home"] } });
    expect(bare).toContain("uploaded nothing yet");
    expect(bare).not.toContain("**Address:**");
    expect(bare).not.toContain("**Colours:**");
  });

  it("ends with where the owner releases it from", () => {
    expect(md).toContain("https://winjodigital.co.uk/admin#builds");
  });

  it("puts a customer's text on one line, so it can't break the list", () => {
    const b = buildHandoffBrief({ ...input, brief: { ...dazBrief, avoid: "one\n\ntwo" } });
    expect(b).toContain("**To avoid:** one; two");
  });
});
