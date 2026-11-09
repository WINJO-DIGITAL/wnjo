import { describe, expect, it } from "vitest";
import { nextStepFor, portalStepIndex, PORTAL_STEPS } from "./portal-steps";

describe("portalStepIndex", () => {
  it("groups the twelve stages into four steps", () => {
    expect(portalStepIndex("brief_received")).toBe(0);
    expect(portalStepIndex("proposal")).toBe(0);
    expect(portalStepIndex("awaiting_payment")).toBe(1);
    expect(portalStepIndex("building")).toBe(2);
    expect(portalStepIndex("preview")).toBe(3);
    expect(portalStepIndex("approval")).toBe(3);
  });
  it("is complete once live", () => {
    expect(portalStepIndex("live")).toBe(PORTAL_STEPS.length);
  });
  it("keeps the step reached when on hold or closed", () => {
    expect(portalStepIndex("on_hold", "building")).toBe(2);
    expect(portalStepIndex("closed")).toBe(0);
  });
});

describe("nextStepFor", () => {
  it("asks the customer to review a sent proposal", () => {
    const n = nextStepFor({ stage: "proposal", route: "proposal", proposalSent: true });
    expect(n.action).toBe(true);
    expect(n.tab).toBe("overview");
  });
  it("asks for the deposit on a bespoke build awaiting payment", () => {
    expect(nextStepFor({ stage: "awaiting_payment", route: "proposal", proposalSent: false }).cta).toBe("Pay now");
  });
  it("sends the customer to changes when the preview is ready", () => {
    expect(nextStepFor({ stage: "preview", route: "package", proposalSent: false }).tab).toBe("changes");
  });
  it("needs nothing from the customer while building", () => {
    expect(nextStepFor({ stage: "building", route: "package", proposalSent: false }).action).toBe(false);
  });
  it("says plainly what is happening before a proposal exists", () => {
    expect(nextStepFor({ stage: "reviewing", route: "package", proposalSent: false }).title).toBe("We're reviewing your brief");
    expect(nextStepFor({ stage: "brief_received", route: "package", proposalSent: false }).title).toBe("We have your brief");
    expect(nextStepFor({ stage: "proposal", route: "proposal", proposalSent: false }).title).toBe("Your proposal is being prepared");
  });
  it("points a package payment at the emailed link", () => {
    expect(nextStepFor({ stage: "awaiting_payment", route: "package", proposalSent: false }).body).toContain("emailed you");
  });
});
