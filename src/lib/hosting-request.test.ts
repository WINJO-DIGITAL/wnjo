import { describe, expect, it } from "vitest";
import { HOSTING_PLANS, cleanHostingRequest, hostingMonthly } from "./hosting-request";

const details = { name: "Sam Rivers", businessName: "Rivers Cafe", email: "sam@riverscafe.co.uk", phone: "", existingWebsite: "riverscafe.co.uk" };
const ok = (over: Record<string, unknown> = {}) => cleanHostingRequest({ plan: "care", status: "have", details, ...over });

describe("a hosting-only request", () => {
  it("takes a plan, where the website is up to, and the contact details", () => {
    const r = ok();
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toMatchObject({ plan: "care", status: "have", details: { email: "sam@riverscafe.co.uk" } });
  });

  it("only offers the three hosting plans, never a made-up one", () => {
    expect(HOSTING_PLANS).toEqual(["hosting", "care", "carePlus"]);
    expect(ok({ plan: "none" }).ok).toBe(false);
    expect(ok({ plan: "platinum" }).ok).toBe(false);
    expect(ok({ plan: undefined }).ok).toBe(false);
  });

  it("prices each plan from the one price list", () => {
    expect(HOSTING_PLANS.map(hostingMonthly)).toEqual([49, 95, 220]);
  });

  it("needs the website address from someone who has a website", () => {
    const r = ok({ details: { ...details, existingWebsite: "" } });
    expect(r.ok === false && r.errors.existingWebsite).toMatch(/website address/);
  });

  it("doesn't need an address from someone whose website isn't built yet", () => {
    expect(ok({ status: "need", details: { ...details, existingWebsite: "" } }).ok).toBe(true);
    expect(ok({ status: "other", details: { ...details, existingWebsite: "" } }).ok).toBe(true);
  });

  it("needs a name, business name and a real email, and checks a phone number if given", () => {
    const r = ok({ details: { ...details, name: "", businessName: "", email: "nope" } });
    expect(r.ok === false && Object.keys(r.errors).sort()).toEqual(["businessName", "email", "name"]);
    const phone = ok({ details: { ...details, phone: "123" } });
    expect(phone.ok === false && phone.errors.phone).toBeDefined();
  });

  it("must say where the website is up to", () => {
    const r = ok({ status: "soon" });
    expect(r.ok === false && r.errors.status).toBeDefined();
  });
});
