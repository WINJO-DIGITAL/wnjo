import { describe, expect, it } from "vitest";
import { canRequestCancel, cleanCancelRequest, describeCancelRequest } from "./cancel-request";

describe("cleanCancelRequest", () => {
  it("keeps a known reason and a trimmed comment", () => {
    expect(cleanCancelRequest({ reason: "too_expensive", comment: "  Too much for us  " })).toEqual({ reason: "too_expensive", comment: "Too much for us" });
  });
  it("lets a customer ask with no reason at all", () => {
    expect(cleanCancelRequest({})).toEqual({ reason: "", comment: "" });
    expect(cleanCancelRequest(null)).toEqual({ reason: "", comment: "" });
  });
  it("drops an unknown reason, strips markup and trims the comment", () => {
    expect(cleanCancelRequest({ reason: "nope", comment: "<b>Hi</b>" })).toEqual({ reason: "", comment: "Hi" });
    expect(cleanCancelRequest({ comment: "x".repeat(900) }).comment).toHaveLength(300);
  });
});

describe("describeCancelRequest", () => {
  it("joins the reason and the comment, leaving out what is empty", () => {
    expect(describeCancelRequest({ reason: "switching", comment: "Found a cheaper deal" })).toBe("I'm moving to another provider · Found a cheaper deal");
    expect(describeCancelRequest({ reason: "", comment: "" })).toBe("");
  });
});

describe("canRequestCancel", () => {
  it("allows a running monthly plan", () => {
    expect(canRequestCancel({ kind: "subscription", status: "active" })).toBe(true);
    expect(canRequestCancel({ kind: "subscription", status: "past_due" })).toBe(true);
  });
  it("refuses a one-off, an ended plan, or one already set to end", () => {
    expect(canRequestCancel({ kind: "one_off", status: "paid" })).toBe(false);
    expect(canRequestCancel({ kind: "subscription", status: "cancelled" })).toBe(false);
    expect(canRequestCancel({ kind: "subscription", status: "active", cancel_at_period_end: true })).toBe(false);
  });
});
