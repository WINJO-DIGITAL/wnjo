import { describe, expect, it } from "vitest";
import { pitchFlags } from "./enquiry-flags";

describe("pitch flags", () => {
  it("flags an unsolicited SEO pitch", () => {
    const reasons = pitchFlags("Hi, our SEO agency can increase your organic traffic with guest posts and backlinks.");
    expect(reasons.length).toBeGreaterThan(0);
    expect(reasons).toContain("mentions a guest post");
  });

  it("does not flag someone asking for a website", () => {
    expect(pitchFlags("I'd like a website for my café so local customers can find us on Google.")).toEqual([]);
    expect(pitchFlags("We need help with SEO foundations on the new site.")).toEqual([]);
  });
});
