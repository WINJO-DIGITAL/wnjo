import { describe, expect, it } from "vitest";
import { addressBar, heroProjects, OWNER_QUOTES, projectBySlug, projects, showsAddress } from "@/lib/projects";

describe("OWNER_QUOTES", () => {
  it("shows each pull-quote word for word from the owner's approved quote", () => {
    for (const { project, quote, pull } of OWNER_QUOTES) {
      expect(quote, project.name).toContain(pull);
    }
  });

  it("keeps each pull-quote to a single short sentence", () => {
    for (const { pull } of OWNER_QUOTES) {
      expect(pull.length).toBeLessThanOrEqual(90);
      expect(pull.trim().endsWith(".")).toBe(true);
    }
  });
});

describe("Duratek in the hero and the owners' quotes", () => {
  it("is one of the hero's projects, once, after RAENG Fitness", () => {
    expect(heroProjects.map((p) => p.slug)).toEqual(["ev-exec", "boonma", "raeng-fitness", "duratek"]);
    expect(heroProjects.some((p) => p.inDevelopment)).toBe(false);
    expect(projectBySlug("fystay")?.inDevelopment).toBe(true);
  });

  it("has the owner's quote, credited like the others", () => {
    const entry = OWNER_QUOTES.find((q) => q.project.slug === "duratek");
    expect(entry?.quote).toBe("Finally, a website that does our business justice.");
    expect(entry?.pull).toBe(entry?.quote);
  });
});

describe("project addresses", () => {
  it("links Boonma and Duratek without writing their addresses out", () => {
    const boonma = projectBySlug("boonma")!;
    const duratek = projectBySlug("duratek")!;
    expect(boonma.url).toBe("https://boonma.vercel.app");
    expect(boonma.host).toBe("boonma.co.uk");
    expect(duratek.url).toBe("https://duratek.vercel.app");
    expect(duratek.host).toBe("duratek.vercel.app");
    expect(showsAddress(boonma)).toBe(false);
    expect(showsAddress(duratek)).toBe(false);
    expect(addressBar(boonma)).toBe("Boonma");
    expect(addressBar(duratek)).toBe("Duratek");
  });

  it("keeps every other project's address visible", () => {
    for (const project of projects.filter((p) => p.slug !== "boonma" && p.slug !== "duratek")) {
      expect(showsAddress(project), project.slug).toBe(true);
      expect(addressBar(project), project.slug).toBe(project.host);
    }
  });
});
