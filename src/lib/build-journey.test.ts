import { describe, expect, it } from "vitest";
import {
  approvalState,
  canDecide,
  cleanProposal,
  progressIndex,
  proposalTransition,
  routeFor,
  stageBlocker,
  stagePath,
  type ApprovalRecord,
} from "./build-journey";

const at = (n: number) => `2026-11-09T10:00:0${n}Z`;
const allApproved: ApprovalRecord[] = (["quality", "pricing", "contract", "publication"] as const).map((kind, i) => ({
  kind,
  decision: "approved",
  created_at: at(i),
}));

describe("route", () => {
  it("sends standard monthly packages straight to payment", () => {
    expect(routeFor({ mode: "monthly", oneOffTotal: 199, requiresQuote: false })).toBe("package");
  });

  it("sends one-off websites over £1,000 and anything needing a custom quote to a proposal", () => {
    expect(routeFor({ mode: "oneOff", oneOffTotal: 999, requiresQuote: false })).toBe("package");
    expect(routeFor({ mode: "oneOff", oneOffTotal: 1001, requiresQuote: false })).toBe("package");
    expect(routeFor({ mode: "monthly", oneOffTotal: 0, requiresQuote: true })).toBe("proposal");
  });

  it("only includes a proposal stage on the bespoke path", () => {
    expect(stagePath("package")).not.toContain("proposal");
    expect(stagePath("proposal")).toContain("proposal");
    expect(stagePath("proposal").at(-1)).toBe("live");
  });
});

describe("approvals", () => {
  it("lets only owners and admins approve pricing, contract and publication", () => {
    expect(canDecide("staff", "quality")).toBe(true);
    expect(canDecide("staff", "pricing")).toBe(false);
    expect(canDecide("staff", "publication")).toBe(false);
    expect(canDecide("admin", "publication")).toBe(true);
  });

  it("uses the latest decision for each approval", () => {
    const state = approvalState([
      { kind: "quality", decision: "approved", created_at: at(1) },
      { kind: "quality", decision: "rejected", created_at: at(2) },
      { kind: "pricing", decision: "rejected", created_at: at(1) },
      { kind: "pricing", decision: "approved", created_at: at(3) },
    ]);
    expect(state).toEqual({ quality: "rejected", pricing: "approved", contract: "pending", publication: "pending" });
  });

  it("blocks going live until all four are approved", () => {
    const ctx = { route: "package" as const, proposalAccepted: false };
    expect(stageBlocker("live", { ...ctx, approvals: allApproved.slice(0, 3) })).toMatch(/Publication/);
    expect(stageBlocker("live", { ...ctx, approvals: allApproved })).toBeNull();
    const revoked = [...allApproved, { kind: "quality" as const, decision: "rejected" as const, created_at: at(9) }];
    expect(stageBlocker("live", { ...ctx, approvals: revoked })).toMatch(/Quality/);
  });

  it("blocks payment on a bespoke brief until the proposal is accepted", () => {
    expect(stageBlocker("awaiting_payment", { route: "proposal", approvals: [], proposalAccepted: false })).toMatch(/accept/);
    expect(stageBlocker("awaiting_payment", { route: "proposal", approvals: [], proposalAccepted: true })).toBeNull();
    expect(stageBlocker("awaiting_payment", { route: "package", approvals: [], proposalAccepted: false })).toBeNull();
    expect(stageBlocker("proposal", { route: "package", approvals: [], proposalAccepted: false })).toMatch(/bespoke/);
  });

  it("keeps the progress position for off-path stages", () => {
    expect(progressIndex("package", "reviewing")).toBe(1);
    expect(progressIndex("package", "on_hold", "building")).toBe(stagePath("package").indexOf("building"));
  });
});

describe("proposals", () => {
  it("needs a person with an owner or admin role to approve", () => {
    expect(proposalTransition("pending_approval", "approve", "staff")).toEqual({ ok: false, reason: expect.stringMatching(/permission/) });
    expect(proposalTransition("pending_approval", "approve", "owner")).toEqual({ ok: true, to: "approved" });
  });

  it("can't be sent before it is approved", () => {
    expect(proposalTransition("draft", "send", "owner").ok).toBe(false);
    expect(proposalTransition("pending_approval", "send", "owner").ok).toBe(false);
    expect(proposalTransition("approved", "send", "staff")).toEqual({ ok: true, to: "sent" });
  });

  it("can only be accepted or declined by the customer, once sent", () => {
    expect(proposalTransition("sent", "accept", "owner").ok).toBe(false);
    expect(proposalTransition("approved", "accept", "customer").ok).toBe(false);
    expect(proposalTransition("sent", "decline", "customer")).toEqual({ ok: true, to: "declined" });
    expect(proposalTransition("accepted", "withdraw", "owner").ok).toBe(false);
  });

  it("goes back to draft when an approver rejects it", () => {
    expect(proposalTransition("pending_approval", "reject", "admin")).toEqual({ ok: true, to: "draft" });
  });

  it("totals lines by type and rejects empty or invalid ones", () => {
    const r = cleanProposal({
      summary: "Bespoke salon site",
      lines: [
        { label: "Design and build", amount: 1800, kind: "one_off" },
        { label: "Booking integration", amount: 199.999, kind: "one_off" },
        { label: "Care", amount: 95, kind: "monthly" },
      ],
    });
    expect(r.ok && r.totals).toEqual({ setup: 0, monthly: 95, oneOff: 2000 });
    expect(cleanProposal({ lines: [] }).ok).toBe(false);
    expect(cleanProposal({ lines: [{ label: "x", amount: -1, kind: "one_off" }] }).ok).toBe(false);
    expect(cleanProposal({ lines: [{ label: "x", amount: 0, kind: "one_off" }] }).ok).toBe(false);
    expect(cleanProposal({ lines: [{ label: "x", amount: 10, kind: "discount" }] }).ok).toBe(false);
  });
});
