import { describe, expect, it } from "vitest";
import { extraMainHosts, hostOf, isMainHost, normaliseHostname, siteRewritePath } from "./hosts";

describe("hostOf", () => {
  it("lower-cases and drops the port and a trailing dot", () => {
    expect(hostOf("Barber.Example.CO.UK:3000")).toBe("barber.example.co.uk");
    expect(hostOf("example.com.")).toBe("example.com");
    expect(hostOf(null)).toBe("");
  });
});

describe("isMainHost", () => {
  it("treats our own addresses and Vercel preview addresses as ours", () => {
    for (const h of ["winjodigital.co.uk", "www.winjodigital.co.uk", "localhost", "wnjo-git-branch.vercel.app", ""]) expect(isMainHost(h), h).toBe(true);
  });
  it("treats any other address, including our own subdomains, as a customer's site", () => {
    for (const h of ["barber.winjodigital.co.uk", "hartleyandsons.co.uk", "www.hartleyandsons.co.uk"]) expect(isMainHost(h), h).toBe(false);
  });
  it("accepts extra addresses from the setting", () => {
    expect(isMainHost("staging.example.com", extraMainHosts("staging.example.com, other.example.com"))).toBe(true);
  });
});

describe("siteRewritePath", () => {
  it("sends a customer's address to its own place, keeping the path", () => {
    expect(siteRewritePath("hartley.co.uk", "/")).toBe("/sites/hartley.co.uk");
    expect(siteRewritePath("hartley.co.uk", "/services")).toBe("/sites/hartley.co.uk/services");
    expect(siteRewritePath("hartley.co.uk", "/photo")).toBe("/sites/hartley.co.uk/photo");
  });
  it("leaves our own addresses alone", () => {
    expect(siteRewritePath("winjodigital.co.uk", "/pricing")).toBeNull();
    expect(siteRewritePath("abc.vercel.app", "/")).toBeNull();
  });
});

describe("normaliseHostname", () => {
  it("tidies a typed address", () => {
    expect(normaliseHostname("https://Www.Hartley.co.uk/about?x=1")).toBe("www.hartley.co.uk");
    expect(normaliseHostname("  hartley.co.uk:443 ")).toBe("hartley.co.uk");
  });
  it("refuses anything that isn't a plain domain name", () => {
    for (const bad of ["", "localhost", "hartley", "192.168.0.1", "hart ley.co.uk", "-bad.co.uk", "a_b.co.uk", "http://", "x".repeat(300) + ".com"]) expect(normaliseHostname(bad), bad).toBeNull();
  });
  it("refuses our own addresses, so a customer site can never take over ours", () => {
    for (const bad of ["winjodigital.co.uk", "WWW.winjodigital.co.uk", "preview.vercel.app"]) expect(normaliseHostname(bad), bad).toBeNull();
  });
  it("allows a subdomain of ours for a customer site", () => {
    expect(normaliseHostname("hartley.winjodigital.co.uk")).toBe("hartley.winjodigital.co.uk");
  });
});
