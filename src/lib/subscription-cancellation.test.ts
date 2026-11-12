import { describe, expect, it } from "vitest";
import { KIND_LABEL, cancelTransition, cancellationReason, logSubscriptionEvent, needsStaffAlert } from "./subscription-cancellation";

describe("cancelTransition", () => {
  it("sees a cancel asked for, and one withdrawn", () => {
    expect(cancelTransition(false, true)).toBe("cancel_requested");
    expect(cancelTransition(true, false)).toBe("cancel_withdrawn");
  });

  it("sees nothing when cancelling didn't change, so a repeated update doesn't log twice", () => {
    expect(cancelTransition(true, true)).toBeNull();
    expect(cancelTransition(false, false)).toBeNull();
  });
});

describe("cancellationReason", () => {
  it("uses Stripe's reason, the customer's feedback and their comment", () => {
    expect(cancellationReason({ cancellation_details: { reason: "cancellation_requested", feedback: "too_expensive", comment: "Too much for us" } })).toBe(
      "Customer asked to cancel · Too expensive · Too much for us",
    );
  });

  it("says payment failed when that is why it ended", () => {
    expect(cancellationReason({ cancellation_details: { reason: "payment_failed" } })).toBe("Payment failed");
  });

  it("is empty when Stripe gave no reason, and ignores unknown values and markup", () => {
    expect(cancellationReason({})).toBe("");
    expect(cancellationReason({ cancellation_details: { reason: "made_up", feedback: "nope", comment: "<b>hi</b>" } })).toBe("hi");
  });
});

describe("staff attention", () => {
  it("alerts the day a cancel is asked for, the day it ends, and on a failed payment, but not on a withdrawal", () => {
    expect(needsStaffAlert("cancel_requested")).toBe(true);
    expect(needsStaffAlert("ended")).toBe(true);
    expect(needsStaffAlert("payment_failed")).toBe(true);
    expect(needsStaffAlert("cancel_withdrawn")).toBe(false);
  });

  it("has a plain label for every kind", () => {
    expect(KIND_LABEL.cancel_requested).toBe("Cancellation requested");
  });
});

describe("logSubscriptionEvent", () => {
  const row = { id: "s1", tenant_id: "t1" };
  const fakeDb = (returned: unknown[]) => {
    const calls: Record<string, unknown>[] = [];
    return {
      calls,
      db: {
        from() {
          return {
            upsert(payload: Record<string, unknown>) {
              calls.push(payload);
              return { select: async () => ({ data: returned, error: null }) };
            },
          };
        },
      },
    };
  };

  it("writes the entry once, keyed by the Stripe event", async () => {
    const f = fakeDb([{ id: "e1" }]);
    expect(await logSubscriptionEvent(f.db, row, "cancel_requested", "Too expensive", "evt_1")).toBe(true);
    expect(f.calls[0]).toMatchObject({ tenant_id: "t1", subscription_id: "s1", kind: "cancel_requested", stripe_event_id: "evt_1" });
  });

  it("reports a repeat as already there, so no second alert goes out", async () => {
    const f = fakeDb([]);
    expect(await logSubscriptionEvent(f.db, row, "cancel_requested", "", "evt_1")).toBe(false);
  });
});
