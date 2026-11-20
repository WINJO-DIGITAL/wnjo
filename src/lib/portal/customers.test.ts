import { describe, expect, it } from "vitest";
import { buildCustomers, customerTimeline, renewalOf, viewCustomers, type BriefRow, type EnquiryRow, type SubRow } from "./customers";
import { planInfo, PLAN_RULES } from "./plan-info";
import { CARE_PLANS, WEBSITE_PLANS } from "@/lib/pricing";

const sub = (over: Partial<SubRow>): SubRow => ({
  id: "s1", reference: "WS-AAAAAA", kind: "subscription", status: "active", name: "Ada Lake", business_name: "Lake Bakery", email: "ada@lake.test",
  package_name: "Core", setup_pence: 0, monthly_pence: 9900, one_off_pence: 0, payments_count: 2, cancel_at_period_end: false, livemode: true, created_at: "2026-10-01T09:00:00Z", ...over,
});
const brief = (over: Partial<BriefRow>): BriefRow => ({ id: "b1", reference: "WNJO-111111", email: "ada@lake.test", name: "Ada Lake", business_name: "Lake Bakery", stage: "building", created_at: "2026-09-20T09:00:00Z", ...over });
const enquiry = (over: Partial<EnquiryRow>): EnquiryRow => ({ id: "e1", reference: "WNJO-222222", kind: "contact", name: "Bo Reed", email: "bo@reed.test", topic: null, created_at: "2026-11-01T09:00:00Z", ...over });

describe("the customer directory", () => {
  it("joins a person's records by email, whatever the letter case", () => {
    const all = buildCustomers([sub({ email: "Ada@Lake.test" })], [brief({})], [enquiry({ email: "ADA@lake.test", id: "e2" }), enquiry({})]);
    expect(all).toHaveLength(2);
    const ada = all.find((c) => c.email === "ada@lake.test")!;
    expect([ada.subscriptions.length, ada.briefs.length, ada.enquiries.length]).toEqual([1, 1, 1]);
    expect([ada.name, ada.business]).toEqual(["Ada Lake", "Lake Bakery"]);
    expect(ada.since).toBe("2026-09-20T09:00:00Z");
  });

  it("says where each customer stands, worst news first", () => {
    const state = (subs: SubRow[]) => buildCustomers(subs, [], [])[0]?.state;
    expect(state([sub({}), sub({ id: "s2", status: "past_due" })])).toBe("overdue");
    expect(state([sub({})])).toBe("active");
    expect(state([sub({ cancel_at_period_end: true })])).toBe("ending");
    expect(state([sub({ status: "offered" })])).toBe("awaiting_payment");
    expect(state([sub({ status: "cancelled" })])).toBe("ended");
    expect(state([sub({ kind: "one_off", status: "paid", monthly_pence: 0 })])).toBe("active");
    expect(buildCustomers([], [], [enquiry({})])[0].state).toBe("lead");
  });

  it("counts only running, real plans towards what a customer pays each month", () => {
    const [c] = buildCustomers([sub({}), sub({ id: "s2", status: "offered", monthly_pence: 4900 }), sub({ id: "s3", livemode: false, monthly_pence: 19900 }), sub({ id: "s4", status: "past_due", monthly_pence: 4900 })], [], []);
    expect(c.monthlyPence).toBe(14800);
  });

  it("treats a customer with only test-mode plans as a lead, never as paying", () => {
    const [c] = buildCustomers([sub({ livemode: false })], [], []);
    expect([c.state, c.monthlyPence]).toEqual(["lead", 0]);
  });

  it("filters, searches by name, business, email or reference, and sorts", () => {
    const all = buildCustomers([sub({}), sub({ id: "s9", email: "cy@moss.test", name: "Cy Moss", business_name: "Moss & Co", status: "offered", reference: "WS-ZZZZZZ", created_at: "2026-11-10T09:00:00Z" })], [], [enquiry({})]);
    const view = (o: Partial<Parameters<typeof viewCustomers>[1]>) => viewCustomers(all, { filter: "all", search: "", sort: "recent", ...o }).map((c) => c.email);
    expect(view({})).toEqual(["cy@moss.test", "bo@reed.test", "ada@lake.test"]);
    expect(view({ filter: "active" })).toEqual(["ada@lake.test"]);
    expect(view({ search: "moss" })).toEqual(["cy@moss.test"]);
    expect(view({ search: "ws-aaaaaa" })).toEqual(["ada@lake.test"]);
    expect(view({ search: "REED.TEST" })).toEqual(["bo@reed.test"]);
    expect(view({ sort: "name" })).toEqual(["bo@reed.test", "ada@lake.test", "cy@moss.test"]);
    expect(view({ sort: "monthly" })[0]).toBe("ada@lake.test");
  });

  it("tells a customer's story newest first, with payments and cancellations", () => {
    const [c] = buildCustomers([sub({ first_payment_at: "2026-10-02T09:00:00Z" })], [brief({})], []);
    const t = customerTimeline(c, { payments: [{ subscription_id: "s1", amount_pence: 9900, paid_at: "2026-11-02T09:00:00Z" }], events: [{ subscription_id: "s1", kind: "payment_failed", reason: "card declined", created_at: "2026-11-03T09:00:00Z" }], eventLabel: () => "Payment failed" });
    expect(t.map((i) => i.title)).toEqual(["Payment failed", "Paid £99", "Plan started", "Payment link created", "Website started"]);
    expect(t[0].detail).toBe("WS-AAAAAA · card declined");
  });
});

describe("plan information", () => {
  it("reads what a plan includes from the pricing file", () => {
    expect(planInfo("bronze").includes).toBe(WEBSITE_PLANS.bronze.includes);
    expect(planInfo("silver").name).toBe(WEBSITE_PLANS.silver.name);
    expect(planInfo("hosting").includes).toBe(CARE_PLANS.hosting.includes);
    expect(planInfo("gold").replyWorkingDays).toBe(1);
    expect(planInfo("care_plus").name).toBe(CARE_PLANS.carePlus.label);
    expect(planInfo("bronze").refresh).toMatch(/every 24 months/);
  });

  it("falls back to the stored name for a plan it doesn't know, and claims nothing for it", () => {
    const info = planInfo("legacy", "Old plan");
    expect([info.name, info.includes.length, info.refresh]).toEqual(["Old plan", 0, null]);
  });

  it("states the subscription rules without a minimum term or a notice period", () => {
    const text = PLAN_RULES.join(" ");
    expect(text).toMatch(/no minimum term/);
    expect(text).toMatch(/Cancel any time/);
    expect(text).not.toMatch(/notice to end|12 months|contract/i);
  });
});

describe("when a customer's plan renews", () => {
  const renews = (subs: SubRow[]) => renewalOf(subs);

  it("is the next payment date of a running plan", () => {
    expect(renews([sub({ current_period_end: "2026-12-05T00:00:00Z" })])).toEqual({ at: "2026-12-05T00:00:00Z", kind: "renews" });
  });

  it("says a plan being cancelled ends on that date, and a failed payment is overdue", () => {
    expect(renews([sub({ current_period_end: "2026-12-05T00:00:00Z", cancel_at_period_end: true })])?.kind).toBe("ends");
    expect(renews([sub({ current_period_end: "2026-11-25T00:00:00Z", status: "past_due" })])?.kind).toBe("overdue");
  });

  it("takes the soonest date across plans, and an overdue plan always comes first", () => {
    expect(renews([sub({ current_period_end: "2026-12-20T00:00:00Z" }), sub({ id: "s2", current_period_end: "2026-12-02T00:00:00Z" })])?.at).toBe("2026-12-02T00:00:00Z");
    const mixed = renews([sub({ current_period_end: "2026-12-02T00:00:00Z" }), sub({ id: "s2", status: "past_due", current_period_end: "2026-12-30T00:00:00Z" })]);
    expect(mixed).toEqual({ at: "2026-12-30T00:00:00Z", kind: "overdue" });
  });

  it("ignores test-mode plans, plans that aren't running and plans with no date", () => {
    expect(renews([sub({ livemode: false, current_period_end: "2026-12-05T00:00:00Z" })])).toBeNull();
    expect(renews([sub({ status: "offered", current_period_end: "2026-12-05T00:00:00Z" })])).toBeNull();
    expect(renews([sub({})])).toBeNull();
  });

  it("can sort the directory by renewal: overdue first, then soonest, then customers with no date", () => {
    const all = buildCustomers(
      [
        sub({ email: "late@x.test", name: "Late", business_name: "Late Co", current_period_end: "2026-12-28T00:00:00Z" }),
        sub({ id: "s2", email: "soon@x.test", name: "Soon", business_name: "Soon Co", current_period_end: "2026-12-01T00:00:00Z" }),
        sub({ id: "s3", email: "due@x.test", name: "Due", business_name: "Due Co", status: "past_due", current_period_end: "2026-12-30T00:00:00Z" }),
        sub({ id: "s4", email: "none@x.test", name: "None", business_name: "None Co", status: "offered" }),
      ],
      [],
      [],
    );
    expect(viewCustomers([...all], { filter: "all", search: "", sort: "renewal" }).map((c) => c.business)).toEqual(["Due Co", "Soon Co", "Late Co", "None Co"]);
  });
});
