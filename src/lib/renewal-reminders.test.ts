import { describe, expect, it } from "vitest";
import { addMonths, reminderDue } from "./renewal-reminders";

const sub = (over: Record<string, unknown> = {}) => ({ kind: "subscription", status: "active", cancel_at_period_end: false, first_payment_at: "2026-01-15T10:00:00Z", minimum_term_months: 12, ...over });
const at = (iso: string) => new Date(iso);

describe("addMonths", () => {
  it("keeps the day, and uses the month's last day when there is no such day", () => {
    expect(addMonths(at("2026-01-15T00:00:00Z"), 12).toISOString().slice(0, 10)).toBe("2027-01-15");
    expect(addMonths(at("2026-01-31T00:00:00Z"), 1).toISOString().slice(0, 10)).toBe("2026-02-28");
    expect(addMonths(at("2026-08-31T00:00:00Z"), 6).toISOString().slice(0, 10)).toBe("2027-02-28");
  });
});

describe("reminderDue", () => {
  it("is due in the 14 days before the minimum term ends, and says so", () => {
    expect(reminderDue(sub(), at("2027-01-02T00:00:00Z"))).toEqual({ date: "2027-01-15", isTermEnd: true });
    expect(reminderDue(sub(), at("2027-01-14T00:00:00Z"))).toEqual({ date: "2027-01-15", isTermEnd: true });
  });

  it("is not due earlier, or once the date has passed", () => {
    expect(reminderDue(sub(), at("2026-12-01T00:00:00Z"))).toBeNull();
    expect(reminderDue(sub(), at("2027-01-16T00:00:00Z"))).toBeNull();
  });

  it("comes again every six months after the term", () => {
    expect(reminderDue(sub(), at("2027-07-05T00:00:00Z"))).toEqual({ date: "2027-07-15", isTermEnd: false });
    expect(reminderDue(sub(), at("2028-01-05T00:00:00Z"))).toEqual({ date: "2028-01-15", isTermEnd: false });
  });

  it("works for a plan with no minimum term, from its first payment", () => {
    expect(reminderDue(sub({ minimum_term_months: 0 }), at("2026-01-05T00:00:00Z"))).toBeNull();
    expect(reminderDue(sub({ minimum_term_months: 0 }), at("2026-07-05T00:00:00Z"))).toEqual({ date: "2026-07-15", isTermEnd: false });
  });

  it("sends nothing for a plan that isn't running, is ending, or hasn't been paid", () => {
    const when = at("2027-01-05T00:00:00Z");
    expect(reminderDue(sub({ status: "cancelled" }), when)).toBeNull();
    expect(reminderDue(sub({ cancel_at_period_end: true }), when)).toBeNull();
    expect(reminderDue(sub({ first_payment_at: null }), when)).toBeNull();
    expect(reminderDue(sub({ kind: "one_off" }), when)).toBeNull();
  });
});
