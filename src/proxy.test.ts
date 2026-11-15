import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { proxy } from "./proxy";

const call = (url: string, host?: string) => proxy(new NextRequest(url, host ? { headers: { host } } : undefined));
const rewrittenTo = (res: Response) => res.headers.get("x-middleware-rewrite");

describe("the proxy", () => {
  it("serves a customer's address from its own place, keeping the path and the query", () => {
    expect(rewrittenTo(call("https://hartley.co.uk/services?sent=1", "hartley.co.uk"))).toContain("/sites/hartley.co.uk/services?sent=1");
    expect(rewrittenTo(call("https://hartley.co.uk/", "hartley.co.uk"))).toContain("/sites/hartley.co.uk");
  });
  it("lets our own addresses through untouched", () => {
    for (const host of ["winjodigital.co.uk", "www.winjodigital.co.uk", "localhost:3000", "preview-abc.vercel.app"]) {
      expect(rewrittenTo(call(`https://${host}/pricing`, host)), host).toBeNull();
    }
  });
  it("treats a customer's address as theirs even when the port is in the header", () => {
    expect(rewrittenTo(call("http://barber.e2e.test:3100/", "barber.e2e.test:3100"))).toContain("/sites/barber.e2e.test");
  });
});
