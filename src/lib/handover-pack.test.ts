import { describe, expect, it } from "vitest";
import { buildE2ESample } from "@/lib/site-template/e2e-sample";
import type { WebsiteBrief } from "@/lib/website-brief";
import { HANDOVER_CHECKLIST, briefNotes, designNotes, missingChecklist, packEntries, previewWording, readme, safeFileName, siteWording } from "./handover-pack";

const site = buildE2ESample({ sector: "barber", pages: 4, photos: false })!.content;
const all = HANDOVER_CHECKLIST.map((i) => i.id);

describe("handover checklist", () => {
  it("reports every item when nothing is ticked", () => {
    expect(missingChecklist(undefined)).toHaveLength(HANDOVER_CHECKLIST.length);
    expect(missingChecklist("domain")).toHaveLength(HANDOVER_CHECKLIST.length);
    expect(missingChecklist([])).toHaveLength(HANDOVER_CHECKLIST.length);
  });

  it("reports only what is still missing", () => {
    const left = missingChecklist(all.slice(0, 4));
    expect(left).toHaveLength(HANDOVER_CHECKLIST.length - 4);
    expect(left[0]).toBe(HANDOVER_CHECKLIST[4].label);
  });

  it("passes when everything is ticked, and ignores unknown or repeated ids", () => {
    expect(missingChecklist([...all, "made-up", all[0]])).toEqual([]);
  });

  it("does not count unknown ids as ticks", () => {
    expect(missingChecklist(["a", "b", "c", "d", "e", "f"])).toHaveLength(HANDOVER_CHECKLIST.length);
  });
});

describe("website wording", () => {
  it("writes one numbered file per page, home first", () => {
    const files = siteWording(site);
    expect(files).toHaveLength(1 + (site.pages?.length ?? 0));
    expect(files[0].file).toBe("wording/01-home.txt");
    expect(files[0].text.startsWith("Home\n====")).toBe(true);
  });

  it("carries the customer's prices and hours into the text", () => {
    const text = siteWording(site).map((f) => f.text).join("\n");
    const prices = site.sections.concat(...(site.pages ?? []).map((p) => p.sections)).flatMap((s) => (s.kind === "services" ? s.items.filter((i) => i.price).map((i) => i.price!) : []));
    for (const price of prices.slice(0, 3)) expect(text).toContain(price);
  });

  it("writes an older words-only preview too", () => {
    const files = previewWording([{ slug: "home", headline: "Welcome", intro: "Hello", sections: [{ heading: "About", body: "Body", bullets: ["One"] }], cta: "Call us" }], new Map([["home", "Home"]]));
    expect(files[0].file).toBe("wording/01-home.txt");
    expect(files[0].text).toContain("- One");
    expect(files[0].text).toContain("Button: Call us");
  });
});

describe("design notes", () => {
  it("names the colour, look and fonts", () => {
    const notes = designNotes(site);
    expect(notes).toContain(site.theme.colour);
    expect(notes).toContain(`Look: ${site.theme.look}`);
    expect(notes).toMatch(/Fonts: /);
  });
});

describe("file names", () => {
  it("removes folders and odd characters", () => {
    expect(safeFileName("../../etc/passwd")).not.toContain("/");
    expect(safeFileName("..hidden.jpg")).toBe("hidden.jpg");
    expect(safeFileName("shop front (1).jpg")).toBe("shop front _1_.jpg");
    expect(safeFileName("")).toBe("file");
  });
});

describe("the pack", () => {
  const base = { reference: "WNJO-1", businessName: "Hartley Barbers", site, files: [{ name: "front.jpg", data: new Uint8Array([1, 2]) }] };

  it("holds the readme, wording, design notes, structure and the customer's files", () => {
    const names = packEntries(base).map((e) => e.name);
    expect(names).toContain("README.txt");
    expect(names).toContain("design.txt");
    expect(names).toContain("site-content.json");
    expect(names).toContain("files/front.jpg");
    expect(names.filter((n) => n.startsWith("wording/")).length).toBeGreaterThan(1);
  });

  it("keeps two photos with the same name", () => {
    const names = packEntries({ ...base, files: [{ name: "a.jpg", data: new Uint8Array([1]) }, { name: "A.jpg", data: new Uint8Array([2]) }, { name: "a.jpg", data: new Uint8Array([3]) }] }).map((e) => e.name);
    expect(names.filter((n) => n.startsWith("files/"))).toEqual(["files/a.jpg", "files/A-2.jpg", "files/a-3.jpg"]);
  });

  it("works with the older words-only preview and no template site", () => {
    const names = packEntries({ reference: "WNJO-2", businessName: "X", files: [], previewPages: [{ slug: "home", headline: "H", intro: "I", sections: [], cta: "" }] }).map((e) => e.name);
    expect(names).toEqual(["README.txt", "wording/01-home.txt"]);
  });

  it("puts the website address in the readme only when there is one", () => {
    const withAddress = packEntries({ ...base, address: "hartley.co.uk" })[0].data as string;
    expect(withAddress).toContain("https://hartley.co.uk");
    expect(packEntries(base)[0].data as string).not.toContain("https://");
  });
});

describe("the pack for a website built by hand", () => {
  // A hand-built site has no saved pages: the pack holds what the customer told us, and says so.
  const brief: Partial<WebsiteBrief> = {
    goals: [],
    goalNote: "More local bookings",
    pages: ["Home", "Contact"],
    colours: "Black and yellow",
    profile: { services: "Local journeys\nAirport transfers", phone: "07474144600", email: "daz@example.test", differentiator: "Family run", areas: "Blackpool, Fleetwood", hours: "24 hours", proof: "Licensed", about: "", customers: "", firstActions: [], tone: "friendly" },
  };
  const input = { reference: "WNJO-1", businessName: "Daz's Cabs", brief, files: [{ name: "logo.png", data: new Uint8Array([1]) }] };

  it("holds the customer's own words, their files and a readme, with no pages it doesn't have", () => {
    const names = packEntries(input).map((e) => e.name);
    expect(names).toEqual(["README.txt", "your-brief.txt", "files/logo.png"]);
  });

  it("writes what the customer said into the brief", () => {
    const text = briefNotes(brief);
    for (const part of ["More local bookings", "Home, Contact", "Black and yellow", "Airport transfers", "07474144600", "Blackpool, Fleetwood", "Family run"]) expect(text).toContain(part);
  });

  it("only lists in the readme what the pack holds", () => {
    const text = readme(input);
    expect(text).toContain("your-brief.txt");
    expect(text).toContain("built for you by hand");
    expect(text).not.toContain("wording/");
    expect(text).not.toContain("design.txt");
    expect(text).not.toContain("site-content.json");
  });

  it("keeps the template pack as it was", () => {
    const names = packEntries({ reference: "WNJO-2", businessName: "Hartley", site, brief, files: [] }).map((e) => e.name);
    expect(names).toContain("design.txt");
    expect(names).toContain("site-content.json");
    expect(names).not.toContain("your-brief.txt");
    expect(readme({ reference: "WNJO-2", businessName: "Hartley", site, files: [] })).toContain("wording/");
  });
});
