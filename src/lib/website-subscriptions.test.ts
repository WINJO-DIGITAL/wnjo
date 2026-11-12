import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_WEBSITE_ANSWERS, websiteQuote, type WebsiteAnswers } from "./website-quote";
import {
  OFFER_TOKEN_RE,
  checkoutParams,
  firstPaymentPence,
  hashOfferToken,
  monthlyRecurringPence,
  newOfferToken,
  offerFromQuote,
  ownershipDue,
  statusFromStripe,
} from "./website-subscriptions";
import { handleWebsiteSubscriptionEvent } from "./website-subscription-events";

const monthly = (over: Partial<WebsiteAnswers> = {}): WebsiteAnswers => ({
  ...DEFAULT_WEBSITE_ANSWERS,
  want: "monthly",
  mode: "monthly",
  plan: "silver",
  pages: "4-5",
  ...over,
});

describe("offers", () => {
  it("turns a monthly quote into setup, monthly and one-off amounts in pence", () => {
    // Core with local SEO (a one-off extra, not included in Core) and booking (a monthly extra).
    const a = monthly({ plan: "bronze", pages: "4-5", addOns: ["localSeo", "booking"] });
    const offer = offerFromQuote(a, websiteQuote(a));
    expect(offer).toMatchObject({ kind: "subscription", packageCode: "bronze", setupPence: 0, monthlyPence: 11400, oneOffPence: 19900 });
    expect(firstPaymentPence(offer)).toBe(11400 + 19900);
  });

  it("uses staff overrides to match the written proposal", () => {
    const a = monthly();
    const offer = offerFromQuote(a, websiteQuote(a), { setup: 0, monthly: 139 });
    expect(offer.setupPence).toBe(0);
    expect(offer.monthlyPence).toBe(13900);
  });

  it("takes the 50% deposit for a one-off website unless staff set the amount", () => {
    const a = monthly({ want: "oneOff", mode: "oneOff", pages: "6-10" });
    const q = websiteQuote(a);
    expect(offerFromQuote(a, q)).toMatchObject({ kind: "one_off", oneOffPence: Math.round(q.oneOffTotal * 50) });
    expect(offerFromQuote(a, q, { oneOff: 500 }).oneOffPence).toBe(50000);
  });

  it("makes private links that are long, URL-safe and stored only as a hash", () => {
    const { token, hash } = newOfferToken();
    expect(OFFER_TOKEN_RE.test(token)).toBe(true);
    expect(hash).toBe(hashOfferToken(token));
    expect(hash).not.toContain(token);
  });
});

describe("Stripe Checkout", () => {
  const base = { id: "sub-1", reference: "WS-ABC123", email: "ada@example.com" };
  it("charges the monthly price as a subscription and setup plus extras once, with the first month", () => {
    const p = checkoutParams(
      { ...base, kind: "subscription", packageCode: "silver", packageName: "Plus", setupPence: 9900, monthlyPence: 14900, oneOffPence: 19900 },
      { success: "https://x/done", cancel: "https://x/back" },
    );
    expect(p.get("mode")).toBe("subscription");
    expect(p.get("line_items[0][price_data][unit_amount]")).toBe("14900");
    expect(p.get("line_items[0][price_data][recurring][interval]")).toBe("month");
    expect(p.get("line_items[1][price_data][unit_amount]")).toBe("29800");
    expect(p.has("line_items[1][price_data][recurring][interval]")).toBe(false);
    expect(p.get("subscription_data[metadata][website_subscription_id]")).toBe("sub-1");
    expect(p.get("line_items[0][price_data][currency]")).toBe("gbp");
  });

  it("leaves out the one-time line when there is no setup fee or extra", () => {
    const p = checkoutParams(
      { ...base, kind: "subscription", packageCode: "bronze", packageName: "Core", setupPence: 0, monthlyPence: 9900, oneOffPence: 0 },
      { success: "s", cancel: "c" },
    );
    expect(p.has("line_items[1][price_data][unit_amount]")).toBe(false);
  });

  it("charges a one-off website as a single payment", () => {
    const p = checkoutParams(
      { ...base, kind: "one_off", packageCode: "one_off", packageName: "Bespoke website", setupPence: 0, monthlyPence: 0, oneOffPence: 49950 },
      { success: "s", cancel: "c" },
    );
    expect(p.get("mode")).toBe("payment");
    expect(p.get("line_items[0][price_data][unit_amount]")).toBe("49950");
  });
});

describe("figures", () => {
  it("maps Stripe statuses and leaves unknown ones alone", () => {
    expect(statusFromStripe("active")).toBe("active");
    expect(statusFromStripe("past_due")).toBe("past_due");
    expect(statusFromStripe("canceled")).toBe("cancelled");
    expect(statusFromStripe("incomplete")).toBeNull();
  });

  it("dates ownership from the 12th payment, not before, for subscriptions agreed on the earlier terms", () => {
    const dates = Array.from({ length: 12 }, (_, i) => `2027-${String(i + 1).padStart(2, "0")}-01T00:00:00Z`);
    expect(ownershipDue(dates.slice(0, 11), 12)).toBeNull();
    expect(ownershipDue(dates, 12)).toBe("2027-12-01T00:00:00Z");
  });

  it("never dates ownership on a rolling subscription, however many payments are made", () => {
    const dates = Array.from({ length: 12 }, (_, i) => `2027-${String(i + 1).padStart(2, "0")}-01T00:00:00Z`);
    expect(ownershipDue(dates)).toBeNull();
    expect(ownershipDue(dates, 0)).toBeNull();
  });

  it("counts active and overdue subscriptions in monthly recurring revenue", () => {
    expect(
      monthlyRecurringPence([
        { kind: "subscription", status: "active", monthly_pence: 14900 },
        { kind: "subscription", status: "past_due", monthly_pence: 9900 },
        { kind: "subscription", status: "cancelled", monthly_pence: 19900 },
        { kind: "subscription", status: "offered", monthly_pence: 19900 },
        { kind: "one_off", status: "paid", monthly_pence: 0 },
      ]),
    ).toBe(24800);
  });
});

/* ------------------------------------------------------------------ */
/* Webhook handling against an in-memory database                       */
/* ------------------------------------------------------------------ */

type Tables = Record<string, Record<string, unknown>[]>;

/** Just enough of the Supabase query builder for the handler: select/update/upsert with eq/neq filters. */
function fakeDb(tables: Tables): SupabaseClient {
  class Query {
    private filters: [string, string, unknown][] = [];
    private op: "select" | "update" | "upsert" | "insert" = "select";
    private payload: Record<string, unknown> = {};
    private conflict = "";
    private returning = false;
    constructor(private table: string) {}
    select() {
      if (this.op !== "select") this.returning = true;
      return this;
    }
    update(p: Record<string, unknown>) {
      this.op = "update";
      this.payload = p;
      return this;
    }
    insert(p: Record<string, unknown>) {
      this.op = "insert";
      this.payload = p;
      return this;
    }
    upsert(p: Record<string, unknown>, o: { onConflict: string }) {
      this.op = "upsert";
      this.payload = p;
      this.conflict = o.onConflict;
      return this;
    }
    eq(k: string, v: unknown) {
      this.filters.push(["eq", k, v]);
      return this;
    }
    neq(k: string, v: unknown) {
      this.filters.push(["neq", k, v]);
      return this;
    }
    private rows() {
      return (tables[this.table] ??= []).filter((r) =>
        this.filters.every(([op, k, v]) => (op === "eq" ? r[k] === v : r[k] !== v)),
      );
    }
    private run(): { data: unknown; error: null } {
      if (this.op === "select") return { data: this.rows(), error: null };
      if (this.op === "insert") {
        (tables[this.table] ??= []).push({ id: `i${(tables[this.table] ?? []).length + 1}`, ...this.payload });
        return { data: null, error: null };
      }
      if (this.op === "update") {
        const hit = this.rows();
        hit.forEach((r) => Object.assign(r, this.payload));
        return { data: this.returning ? hit.map((r) => ({ id: r.id })) : null, error: null };
      }
      const list = (tables[this.table] ??= []);
      if (list.some((r) => r[this.conflict] === this.payload[this.conflict])) return { data: [], error: null };
      const row = { id: `p${list.length + 1}`, paid_at: new Date(Date.UTC(2027, list.length, 1)).toISOString(), ...this.payload };
      list.push(row);
      return { data: [{ id: row.id }], error: null };
    }
    maybeSingle() {
      const { data } = this.run();
      return Promise.resolve({ data: (data as unknown[])[0] ?? null, error: null });
    }
    then<T>(resolve: (v: { data: unknown; error: null }) => T) {
      return Promise.resolve(this.run()).then(resolve);
    }
  }
  return { from: (t: string) => new Query(t) } as unknown as SupabaseClient;
}

function setup(over: Record<string, unknown> = {}) {
  const tables: Tables = {
    website_subscriptions: [
      {
        id: "sub-1",
        tenant_id: "t1",
        reference: "WS-ABC123",
        kind: "subscription",
        status: "offered",
        email: "ada@example.com",
        name: "Ada Lovelace",
        package_name: "Plus",
        setup_pence: 9900,
        monthly_pence: 14900,
        one_off_pence: 0,
        minimum_term_months: 12,
        ownership_after_payments: 12,
        ownership_eligible_at: null,
        stripe_subscription_id: null,
        ...over,
      },
    ],
    website_subscription_payments: [],
  };
  const deps = { emailCustomer: vi.fn(async () => true), alertStaff: vi.fn(async () => true) };
  return { tables, db: fakeDb(tables), deps, row: tables.website_subscriptions[0] };
}

const completed = (amount: number) => ({
  type: "checkout.session.completed",
  livemode: false,
  data: {
    object: {
      id: "cs_test_1",
      payment_status: "paid",
      amount_total: amount,
      currency: "gbp",
      customer: "cus_1",
      subscription: "stripe_sub_1",
      metadata: { website_subscription_id: "sub-1" },
    },
  },
});
const invoice = (id: string, reason = "subscription_cycle", amount = 14900) => ({
  type: "invoice.paid",
  data: { object: { id, amount_paid: amount, billing_reason: reason, subscription: "stripe_sub_1" } },
});

describe("subscription webhooks", () => {
  it("activates on a matching first payment and welcomes the customer once", async () => {
    const { db, deps, row } = setup();
    expect(await handleWebsiteSubscriptionEvent(db, completed(24800), deps)).toBe("handled");
    expect(row).toMatchObject({ status: "active", stripe_subscription_id: "stripe_sub_1", stripe_customer_id: "cus_1", livemode: false });
    expect(deps.emailCustomer).toHaveBeenCalledTimes(1);
    await handleWebsiteSubscriptionEvent(db, completed(24800), deps);
    expect(deps.emailCustomer).toHaveBeenCalledTimes(1);
  });

  it("refuses to activate when Stripe charged a different amount, and tells staff", async () => {
    const { db, deps, row } = setup();
    await handleWebsiteSubscriptionEvent(db, completed(100), deps);
    expect(row.status).toBe("offered");
    expect(deps.alertStaff).toHaveBeenCalledWith("Website payment does not match the offer", expect.any(String));
    expect(deps.emailCustomer).not.toHaveBeenCalled();
  });

  it("counts each invoice once, even when Stripe retries it", async () => {
    const { db, deps, row, tables } = setup({ status: "active", stripe_subscription_id: "stripe_sub_1" });
    await handleWebsiteSubscriptionEvent(db, invoice("in_1", "subscription_create", 24800), deps);
    await handleWebsiteSubscriptionEvent(db, invoice("in_1", "subscription_create", 24800), deps);
    await handleWebsiteSubscriptionEvent(db, invoice("in_2"), deps);
    expect(tables.website_subscription_payments).toHaveLength(2);
    expect(row.payments_count).toBe(2);
    // The first invoice is covered by the welcome email; the second gets a receipt.
    expect(deps.emailCustomer).toHaveBeenCalledTimes(1);
  });

  it("marks ownership due on the 12th payment and emails it once", async () => {
    const { db, deps, row } = setup({ status: "active", stripe_subscription_id: "stripe_sub_1" });
    for (let i = 1; i <= 12; i++) await handleWebsiteSubscriptionEvent(db, invoice(`in_${i}`, i === 1 ? "subscription_create" : "subscription_cycle"), deps);
    expect(row.payments_count).toBe(12);
    expect(row.ownership_eligible_at).toBeTruthy();
    const ownership = deps.emailCustomer.mock.calls.filter((c) => (c as unknown[])[1] && String(((c as unknown[])[1] as { subject: string }).subject).includes("now yours"));
    expect(ownership).toHaveLength(1);
    await handleWebsiteSubscriptionEvent(db, invoice("in_13"), deps);
    expect(deps.emailCustomer.mock.calls.filter((c) => String(((c as unknown[])[1] as { subject: string }).subject).includes("now yours"))).toHaveLength(1);
  });

  it("finds the subscription by its metadata when an invoice arrives before checkout completes", async () => {
    const { db, deps, tables } = setup();
    const early = {
      type: "invoice.paid",
      data: { object: { id: "in_early", amount_paid: 24800, billing_reason: "subscription_create", parent: { subscription_details: { subscription: "stripe_sub_1", metadata: { website_subscription_id: "sub-1" } } } } },
    };
    expect(await handleWebsiteSubscriptionEvent(db, early, deps)).toBe("handled");
    expect(tables.website_subscription_payments).toHaveLength(1);
  });

  it("flags a failed payment as overdue, and a later payment clears it", async () => {
    const { db, deps, row } = setup({ status: "active", stripe_subscription_id: "stripe_sub_1" });
    await handleWebsiteSubscriptionEvent(db, { type: "invoice.payment_failed", data: { object: { id: "in_f", subscription: "stripe_sub_1", hosted_invoice_url: "https://pay" } } }, deps);
    expect(row.status).toBe("past_due");
    expect(deps.alertStaff).toHaveBeenCalled();
    await handleWebsiteSubscriptionEvent(db, invoice("in_ok"), deps);
    expect(row.status).toBe("active");
  });

  it("ends the subscription once when Stripe deletes it", async () => {
    const { db, deps, row } = setup({ status: "active", stripe_subscription_id: "stripe_sub_1" });
    const deleted = { type: "customer.subscription.deleted", data: { object: { id: "stripe_sub_1", status: "canceled" } } };
    await handleWebsiteSubscriptionEvent(db, deleted, deps);
    await handleWebsiteSubscriptionEvent(db, deleted, deps);
    expect(row.status).toBe("cancelled");
    expect(deps.emailCustomer).toHaveBeenCalledTimes(1);
  });

  it("records a one-off website payment once and marks the offer paid", async () => {
    const { db, deps, row, tables } = setup({ kind: "one_off", monthly_pence: 0, setup_pence: 0, one_off_pence: 49950 });
    const paid = { type: "checkout.session.completed", data: { object: { id: "cs_2", payment_status: "paid", amount_total: 49950, currency: "gbp", payment_intent: "pi_1", metadata: { website_subscription_id: "sub-1" } } } };
    await handleWebsiteSubscriptionEvent(db, paid, deps);
    await handleWebsiteSubscriptionEvent(db, paid, deps);
    expect(row.status).toBe("paid");
    expect(tables.website_subscription_payments).toHaveLength(1);
    expect(deps.emailCustomer).toHaveBeenCalledTimes(1);
  });

  describe("moving the customer's build on after the first payment", () => {
    const withBrief = (over: Record<string, unknown> = {}, brief: Record<string, unknown> = {}) => {
      const s = setup({ enquiry_reference: "WNJO-ABC123", ...over });
      s.tables.website_briefs = [{ id: "b1", tenant_id: "t1", reference: "WNJO-ABC123", route: "package", stage: "awaiting_payment", ...brief }];
      s.tables.website_brief_events = [];
      return s;
    };

    it("a paid subscription moves its build on to the plan and records why", async () => {
      const { db, deps, tables } = withBrief();
      expect(await handleWebsiteSubscriptionEvent(db, completed(24800), deps)).toBe("handled");
      expect(tables.website_briefs[0].stage).toBe("specification");
      expect(tables.website_brief_events).toHaveLength(1);
      expect(tables.website_brief_events[0]).toMatchObject({ kind: "stage", actor_type: "system", detail: { from: "awaiting_payment", to: "specification", note: "Payment received." } });
    });

    it("emails the details form straight after payment when their goals are still missing", async () => {
      const { db, deps } = withBrief({}, { brief: { goals: [] } });
      await handleWebsiteSubscriptionEvent(db, completed(24800), deps);
      expect(deps.emailCustomer).toHaveBeenCalledTimes(1);
      expect(deps.emailCustomer).toHaveBeenCalledWith("ada@example.com", expect.objectContaining({ subject: expect.stringContaining("tell us about your website") }));
    });

    it("asks for the form too when there is no brief yet", async () => {
      const { db, deps } = setup();
      await handleWebsiteSubscriptionEvent(db, completed(24800), deps);
      expect(deps.emailCustomer).toHaveBeenCalledWith("ada@example.com", expect.objectContaining({ subject: expect.stringContaining("tell us about your website") }));
    });

    it("doesn't ask again when their goals are already in", async () => {
      const { db, deps } = withBrief({}, { brief: { goals: ["bookings"] } });
      await handleWebsiteSubscriptionEvent(db, completed(24800), deps);
      expect(deps.emailCustomer).toHaveBeenCalledWith("ada@example.com", expect.objectContaining({ subject: expect.stringContaining("Welcome to WINJO DIGITAL") }));
    });

    it("a one-off payment asks for the form too, when the goals are missing", async () => {
      const { db, deps } = withBrief({ kind: "one_off", monthly_pence: 0, setup_pence: 0, one_off_pence: 49950 }, { route: "proposal", brief: { goals: [] } });
      const paid = { type: "checkout.session.completed", data: { object: { id: "cs_3", payment_status: "paid", amount_total: 49950, currency: "gbp", payment_intent: "pi_3", metadata: { website_subscription_id: "sub-1" } } } };
      await handleWebsiteSubscriptionEvent(db, paid, deps);
      expect(deps.emailCustomer).toHaveBeenCalledWith("ada@example.com", expect.objectContaining({ subject: expect.stringContaining("tell us about your website") }));
    });

    it("a paid one-off deposit does the same", async () => {
      const { db, deps, tables } = withBrief({ kind: "one_off", monthly_pence: 0, setup_pence: 0, one_off_pence: 49950 }, { route: "proposal" });
      const paid = { type: "checkout.session.completed", data: { object: { id: "cs_2", payment_status: "paid", amount_total: 49950, currency: "gbp", payment_intent: "pi_1", metadata: { website_subscription_id: "sub-1" } } } };
      await handleWebsiteSubscriptionEvent(db, paid, deps);
      expect(tables.website_briefs[0].stage).toBe("specification");
    });

    it("a repeated event doesn't move it again, and a payment that doesn't match the offer moves nothing", async () => {
      const { db, deps, tables } = withBrief();
      await handleWebsiteSubscriptionEvent(db, completed(24800), deps);
      await handleWebsiteSubscriptionEvent(db, completed(24800), deps);
      expect(tables.website_brief_events).toHaveLength(1);
      const wrong = withBrief();
      await handleWebsiteSubscriptionEvent(wrong.db, completed(100), wrong.deps);
      expect(wrong.tables.website_briefs[0].stage).toBe("awaiting_payment");
    });

    it("leaves a build alone that has already moved past payment, or has no brief at all", async () => {
      const later = withBrief({}, { stage: "building" });
      await handleWebsiteSubscriptionEvent(later.db, completed(24800), later.deps);
      expect(later.tables.website_briefs[0].stage).toBe("building");
      const plain = setup();
      expect(await handleWebsiteSubscriptionEvent(plain.db, completed(24800), plain.deps)).toBe("handled");
    });
  });

  it("ignores events that aren't for a website subscription, so deposits still work", async () => {
    const { db, deps } = setup();
    expect(await handleWebsiteSubscriptionEvent(db, { type: "checkout.session.completed", data: { object: { id: "cs_dep", metadata: { deposit_id: "d1" } } } }, deps)).toBe("ignored");
    expect(await handleWebsiteSubscriptionEvent(db, { type: "invoice.paid", data: { object: { id: "in_x", subscription: "someone_else" } } }, deps)).toBe("ignored");
  });
});

describe("accepted proposal figures", () => {
  it("keeps a monthly proposal's amounts and takes the deposit share of a one-off proposal", async () => {
    const { proposalOverrides } = await import("./website-subscriptions");
    expect(proposalOverrides("monthly", { setup_pence: 14900, monthly_pence: 24900, one_off_pence: 19900 })).toEqual({
      setup: 149,
      monthly: 249,
      oneOff: 199,
    });
    expect(proposalOverrides("oneOff", { setup_pence: 0, monthly_pence: 0, one_off_pence: 250001 })).toEqual({ oneOff: 1250.01 });
  });
});

describe("tracking a cancellation from Stripe", () => {
  const updated = (id: string, cancelAtEnd: boolean, extra: Record<string, unknown> = {}) => ({
    id,
    type: "customer.subscription.updated",
    data: { object: { id: "stripe_sub_1", status: "active", cancel_at_period_end: cancelAtEnd, ...extra } },
  });
  const deleted = (id: string, extra: Record<string, unknown> = {}) => ({
    id,
    type: "customer.subscription.deleted",
    data: { object: { id: "stripe_sub_1", status: "canceled", ...extra } },
  });

  it("logs a cancel asked for once, with Stripe's reason, and alerts staff the same day", async () => {
    const { db, deps, tables } = setup({ status: "active", stripe_subscription_id: "stripe_sub_1", cancel_at_period_end: false });
    const reason = { cancellation_details: { reason: "cancellation_requested", feedback: "too_expensive" } };
    await handleWebsiteSubscriptionEvent(db, updated("evt_c1", true, reason), deps);
    await handleWebsiteSubscriptionEvent(db, updated("evt_c1", true, reason), deps);
    const events = tables.website_subscription_events ?? [];
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ kind: "cancel_requested", reason: "Customer asked to cancel · Too expensive", stripe_event_id: "evt_c1" });
    expect(deps.alertStaff).toHaveBeenCalledTimes(1);
  });

  it("does not log or alert again when Stripe repeats an update that changed nothing", async () => {
    const { db, deps, tables } = setup({ status: "active", stripe_subscription_id: "stripe_sub_1", cancel_at_period_end: true });
    await handleWebsiteSubscriptionEvent(db, updated("evt_n1", true), deps);
    expect(tables.website_subscription_events ?? []).toHaveLength(0);
    expect(deps.alertStaff).not.toHaveBeenCalled();
  });

  it("logs a withdrawn cancel without alerting staff", async () => {
    const { db, deps, tables } = setup({ status: "active", stripe_subscription_id: "stripe_sub_1", cancel_at_period_end: true });
    await handleWebsiteSubscriptionEvent(db, updated("evt_w1", false), deps);
    expect(tables.website_subscription_events).toEqual([expect.objectContaining({ kind: "cancel_withdrawn" })]);
    expect(deps.alertStaff).not.toHaveBeenCalled();
  });

  it("logs the end once, and alerts staff once", async () => {
    const { db, deps, tables } = setup({ status: "active", stripe_subscription_id: "stripe_sub_1", cancel_at_period_end: true });
    await handleWebsiteSubscriptionEvent(db, deleted("evt_e1"), deps);
    await handleWebsiteSubscriptionEvent(db, deleted("evt_e2"), deps);
    expect((tables.website_subscription_events ?? []).filter((e) => e.kind === "ended")).toHaveLength(1);
    expect(deps.alertStaff).toHaveBeenCalledTimes(1);
  });

  it("logs a failed payment with a reason", async () => {
    const { db, deps, tables } = setup({ status: "active", stripe_subscription_id: "stripe_sub_1" });
    await handleWebsiteSubscriptionEvent(db, { id: "evt_p1", type: "invoice.payment_failed", data: { object: { id: "in_f", subscription: "stripe_sub_1" } } }, deps);
    expect(tables.website_subscription_events).toEqual([expect.objectContaining({ kind: "payment_failed", reason: "Payment failed" })]);
  });
});
