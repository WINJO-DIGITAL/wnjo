import { describe, expect, it } from "vitest";
import { GET } from "./route";

describe("llms.txt", () => {
  it("does not print a web address for a project whose domain is not live", async () => {
    const text = await (await GET()).text();
    expect(text).not.toContain("boonma.co.uk");
    expect(text).not.toContain("boonma.vercel.app");
    expect(text).not.toContain("duratek.vercel.app");
    expect(text).toContain("/work#boonma");
    expect(text).toContain("/work#duratek");
    expect(text).toContain("https://www.evexec.co.uk");
    expect(text).toContain("https://raengfitness.co.uk");
    expect(text).toContain("https://www.fystay.co.uk");
  });
});
