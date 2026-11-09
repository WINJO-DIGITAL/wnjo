import { describe, expect, it } from "vitest";
import { advanceAfterPayment, markAwaitingPayment, PAYABLE_FROM } from "./brief-payment";
import { payLinkEmail } from "./website-emails";
import { proposalPayNowFor } from "./pay-now";
import { DEFAULT_WEBSITE_ANSWERS, websiteQuote } from "./website-quote";
import { ONE_OFF_DEPOSIT_SHARE, firstPaymentPence, offerFromQuote, payNowFor, proposalOverrides } from "./website-subscriptions";
import type { SupabaseClient } from "@supabase/supabase-js";

const monthly = { mode: "monthly" as const, initialPayment: 298, oneOffTotal: 0, requiresQuote: false };
const oneOff = { mode: "oneOff" as const, initialPayment: 999, oneOffTotal: 999, requiresQuote: false };

describe("payNowFor: what a customer pays straight from their quote", () => {
  it("takes the first payment (setup plus first month) for a monthly package", () => {
    expect(payNowFor("package", monthly)).toEqual({ kind: "first_payment", pence: 29800 });
  });
  it("takes the 50% deposit for a one-off website", () => {
    expect(ONE_OFF_DEPOSIT_SHARE).toBe(0.5);
    expect(payNowFor("package", oneOff)).toEqual({ kind: "deposit", pence: 49950 });
  });
  it("never takes payment from a quote that needs a proposal", () => {
    expect(payNowFor("proposal", monthly)).toBeNull();
    expect(payNowFor("proposal", { ...oneOff, oneOffTotal: 2500 })).toBeNull();
    expect(payNowFor("package", { ...monthly, requiresQuote: true })).toBeNull();
  });
  it("has nothing to take when the amount is zero", () => {
    expect(payNowFor("package", { ...oneOff, oneOffTotal: 0 })).toBeNull();
  });
});

describe("payLinkEmail", () => {
  const facts = { reference: "WS-ABC123", name: "Ada Lovelace", packageName: "Plus", kind: "subscription" as const, setupPence: 14900, monthlyPence: 14900, oneOffPence: 0, ownershipAfterPayments: 12, minimumTermMonths: 12 };
  it("carries the private link, the first payment and the term, and says there is nothing to do if already paid", () => {
    const m = payLinkEmail(facts, "https://example.com/subscribe/abc");
    expect(m.subject).toContain("WS-ABC123");
    expect(m.text).toContain("https://example.com/subscribe/abc");
    expect(m.text).toContain("First payment: £298");
    expect(m.text).toContain("12-month minimum term");
    expect(m.text).toContain("If you have already paid");
  });
  it("shows a deposit for a one-off website", () => {
    const m = payLinkEmail({ ...facts, kind: "one_off", setupPence: 0, monthlyPence: 0, oneOffPence: 49950 }, "https://example.com/x");
    expect(m.text).toContain("Deposit: £499.50");
  });
});

/** A small stand-in for the database: briefs answer a lookup, updates and inserts are recorded. */
function fakeDb(brief: Record<string, unknown> | null) {
  const writes: { table: string; op: string; payload: unknown }[] = [];
  const builder = (table: string) => {
    let op = "select";
    let payload: unknown;
    const b: Record<string, unknown> = {};
    for (const m of ["select", "eq"]) b[m] = () => b;
    b.update = (p: unknown) => ((op = "update"), (payload = p), b);
    b.insert = async (p: unknown) => (writes.push({ table, op: "insert", payload: p }), { error: null });
    b.maybeSingle = async () => ({ data: brief, error: null });
    b.then = (res: (v: unknown) => unknown) => {
      if (op === "update") writes.push({ table, op, payload });
      return Promise.resolve({ data: op === "update" && brief ? [{ id: "b1" }] : [], error: null }).then(res);
    };
    return b;
  };
  return { db: { from: builder } as unknown as SupabaseClient, writes };
}
const brief = (route: string, stage: string) => ({ id: "b1", tenant_id: "t1", route, stage });

describe("moving a build when money is involved", () => {
  it("a package build still at the start shows Payment when the customer goes to pay", async () => {
    const { db, writes } = fakeDb(brief("package", "brief_received"));
    await markAwaitingPayment(db, "t1", "WNJO-ABC123");
    expect(writes.find((w) => w.table === "website_briefs")?.payload).toEqual({ stage: "awaiting_payment" });
    expect(writes.find((w) => w.table === "website_brief_events")?.payload).toMatchObject({ kind: "stage", actor_type: "system", detail: { from: "brief_received", to: "awaiting_payment" } });
  });

  it("never drags a build backwards to awaiting payment", async () => {
    for (const stage of ["awaiting_payment", "specification", "building", "live"]) {
      const { db, writes } = fakeDb(brief("package", stage));
      await markAwaitingPayment(db, "t1", "WNJO-ABC123");
      expect(writes).toEqual([]);
    }
  });

  it("the first payment moves a package build on to the plan, and records why", async () => {
    for (const stage of PAYABLE_FROM.package) {
      const { db, writes } = fakeDb(brief("package", stage));
      await advanceAfterPayment(db, "t1", "WNJO-ABC123");
      expect(writes.find((w) => w.table === "website_briefs")?.payload).toEqual({ stage: "specification" });
      expect(writes.find((w) => w.table === "website_brief_events")?.payload).toMatchObject({ detail: { from: stage, to: "specification", note: "Payment received." } });
    }
  });

  it("a bespoke build moves on only from awaiting payment, after its proposal was accepted", async () => {
    for (const stage of ["brief_received", "reviewing", "proposal", "specification", "live"]) {
      const { db, writes } = fakeDb(brief("proposal", stage));
      await advanceAfterPayment(db, "t1", "WNJO-ABC123");
      expect(writes).toEqual([]);
    }
    const { db, writes } = fakeDb(brief("proposal", "awaiting_payment"));
    await advanceAfterPayment(db, "t1", "WNJO-ABC123");
    expect(writes.find((w) => w.table === "website_briefs")?.payload).toEqual({ stage: "specification" });
  });

  it("does nothing for an offer with no build, an unknown build, or a repeated event", async () => {
    const none = fakeDb(null);
    await advanceAfterPayment(none.db, "t1", null);
    await advanceAfterPayment(none.db, "t1", "WNJO-NOPE00");
    expect(none.writes).toEqual([]);
    const done = fakeDb(brief("package", "specification"));
    await advanceAfterPayment(done.db, "t1", "WNJO-ABC123");
    expect(done.writes).toEqual([]);
  });

  it("never throws, even when the database does", async () => {
    const broken = { from: () => { throw new Error("db down"); } } as unknown as SupabaseClient;
    await expect(advanceAfterPayment(broken, "t1", "WNJO-ABC123")).resolves.toBeUndefined();
    await expect(markAwaitingPayment(broken, "t1", "WNJO-ABC123")).resolves.toBeUndefined();
  });
});

describe("proposalPayNowFor: the figure on the Pay button is the figure the server charges", () => {
  const cases: [string, "monthly" | "oneOff", { setup_pence: number; monthly_pence: number; one_off_pence: number }][] = [
    ["a monthly bespoke build", "monthly", { setup_pence: 19900, monthly_pence: 29900, one_off_pence: 10000 }],
    ["a monthly build with no extras", "monthly", { setup_pence: 14900, monthly_pence: 24900, one_off_pence: 0 }],
    ["a one-off build", "oneOff", { setup_pence: 0, monthly_pence: 0, one_off_pence: 250000 }],
    ["a one-off build with an odd amount", "oneOff", { setup_pence: 0, monthly_pence: 0, one_off_pence: 250001 }],
    ["a one-off build over a round figure", "oneOff", { setup_pence: 0, monthly_pence: 0, one_off_pence: 123457 }],
  ];
  for (const [name, mode, agreed] of cases) {
    it(`matches the server for ${name}`, () => {
      const answers = mode === "oneOff" ? { ...DEFAULT_WEBSITE_ANSWERS, mode: "oneOff" as const, want: "oneOff" as const } : DEFAULT_WEBSITE_ANSWERS;
      const quote = websiteQuote(answers);
      const offer = offerFromQuote(answers, quote, proposalOverrides(mode, agreed));
      expect(proposalPayNowFor(mode, agreed).pence).toBe(firstPaymentPence(offer));
    });
  }
  it("is a 50% deposit for a one-off build, and the first payment for a monthly build", () => {
    expect(proposalPayNowFor("oneOff", { setup_pence: 0, monthly_pence: 0, one_off_pence: 250000 })).toEqual({ kind: "deposit", pence: 125000 });
    expect(proposalPayNowFor("monthly", { setup_pence: 19900, monthly_pence: 29900, one_off_pence: 10000 })).toEqual({ kind: "first_payment", pence: 59800 });
  });
});

describe("every payment is in pounds", () => {
  it("turns off automatic conversion on every Stripe checkout", async () => {
    const { checkoutParams } = await import("./website-subscriptions");
    const urls = { success: "https://x/ok", cancel: "https://x/no" };
    const base = { id: "o1", reference: "WS-ABC123", email: "a@b.co", packageName: "Plus", packageCode: "silver" as const, setupPence: 14900, monthlyPence: 14900, oneOffPence: 0 };
    const sub = checkoutParams({ ...base, kind: "subscription" }, urls);
    const one = checkoutParams({ ...base, kind: "one_off", packageCode: "one_off", setupPence: 0, monthlyPence: 0, oneOffPence: 49950 }, urls);
    expect(sub.get("adaptive_pricing[enabled]")).toBe("false");
    expect(one.get("adaptive_pricing[enabled]")).toBe("false");
    expect(sub.get("line_items[0][price_data][currency]")).toBe("gbp");
    expect(one.get("line_items[0][price_data][currency]")).toBe("gbp");
  });
});
