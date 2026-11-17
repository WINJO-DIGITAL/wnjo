import { describe, expect, it } from "vitest";
import { askDomain, cleanDomainAnswer, DOMAIN_COPY } from "./domain-choice";

describe("cleanDomainAnswer", () => {
  it("accepts 'help' without a name", () => {
    expect(cleanDomainAnswer({ choice: "help" })).toEqual({ ok: true, answer: { choice: "help", name: null } });
  });

  it("keeps the name the customer typed, tidied", () => {
    expect(cleanDomainAnswer({ choice: "have", name: " https://Www.HartleyAndSons.co.uk/ " })).toEqual({
      ok: true,
      answer: { choice: "have", name: "www.hartleyandsons.co.uk" },
    });
  });

  it("asks for a name when they say they have one", () => {
    const r = cleanDomainAnswer({ choice: "have", name: "  " });
    expect(r.ok).toBe(false);
  });

  it("refuses something that isn't a web address", () => {
    expect(cleanDomainAnswer({ choice: "have", name: "my shop" }).ok).toBe(false);
    expect(cleanDomainAnswer({ choice: "have", name: "not a domain!" }).ok).toBe(false);
  });

  it("refuses one of our own addresses", () => {
    expect(cleanDomainAnswer({ choice: "have", name: "winjodigital.co.uk" }).ok).toBe(false);
  });

  it("refuses an unknown choice", () => {
    expect(cleanDomainAnswer({ choice: "maybe" }).ok).toBe(false);
    expect(cleanDomainAnswer({}).ok).toBe(false);
  });
});

describe("when the question is asked", () => {
  it("is asked once the customer can see a preview", () => {
    for (const stage of ["preview", "changes", "approval", "live"] as const) expect(askDomain(stage)).toBe(true);
  });

  it("is not asked before a preview exists", () => {
    for (const stage of ["brief_received", "reviewing", "awaiting_payment", "specification", "building"] as const) expect(askDomain(stage)).toBe(false);
  });

  it("uses the agreed wording", () => {
    expect(DOMAIN_COPY.heading).toBe("Your website address");
  });
});
