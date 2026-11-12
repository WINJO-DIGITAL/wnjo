import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_WEBSITE_ANSWERS } from "@/lib/website-quote";

const BRIEF_ID = "3f1c2a4e-9b7d-4c2a-8e1f-0a1b2c3d4e5f";
const state = vi.hoisted(() => ({
  writes: [] as { table: string; op: string; payload: unknown }[],
  user: null as Record<string, unknown> | null,
  brief: null as Record<string, unknown> | null,
  proposal: null as Record<string, unknown> | null,
  enquiry: null as Record<string, unknown> | null,
  paid: [] as Record<string, unknown>[],
  open: [] as Record<string, unknown>[],
  limited: false,
  stripeKey: "sk_test_123" as string | null,
  sessions: [] as URLSearchParams[],
  created: [] as Record<string, unknown>[],
}));

/** Answers the route's two reads of the payments table by the status it filters on: paid (the deposit) or offered. */
function builder(table: string) {
  let op = "select";
  let payload: unknown;
  let status: unknown;
  const b: Record<string, unknown> = {};
  for (const m of ["select", "order", "limit", "neq"]) b[m] = () => b;
  b.eq = (k: string, v: unknown) => {
    if (k === "status") status = v;
    return b;
  };
  b.update = (p: unknown) => ((op = "update"), (payload = p), b);
  b.maybeSingle = async () => ({
    data: table === "website_briefs" ? state.brief : table === "website_proposals" ? state.proposal : table === "enquiries" ? state.enquiry : null,
    error: null,
  });
  b.then = (res: (v: unknown) => unknown) => {
    if (op === "update") state.writes.push({ table, op, payload });
    const rows = op === "select" && table === "website_subscriptions" ? (status === "paid" ? state.paid : state.open) : [];
    return Promise.resolve({ data: rows, error: null }).then(res);
  };
  return b;
}
vi.mock("@/lib/quote-store", () => ({ serviceClient: () => ({ from: builder, auth: { getUser: async () => ({ data: { user: state.user }, error: null }) } }) }));
vi.mock("@/lib/rate-limit-shared", () => ({ LIMITS_PER_ROUTE: { checkout: { max: 10, windowSeconds: 600 } }, sharedRateLimited: async () => state.limited }));
vi.mock("@/lib/stripe", () => ({ stripeConfig: () => ({ secretKey: state.stripeKey }), STRIPE_API: "https://api.stripe.com/v1" }));
vi.mock("@/lib/website-offers", () => ({
  createOffer: async (_db: unknown, input: Record<string, unknown>) => {
    state.created.push(input);
    return { id: "off-new", reference: "WS-NEW123", token: "t".repeat(43), amounts: {} };
  },
}));
vi.mock("@/lib/website-subscriptions", async (importActual) => ({
  ...(await importActual<typeof import("@/lib/website-subscriptions")>()),
  createOfferCheckout: async (_key: string, params: URLSearchParams) => {
    state.sessions.push(params);
    return { id: "cs_test_1", url: "https://checkout.stripe.com/c/pay/cs_test_1", livemode: false };
  },
}));
const { POST } = await import("./route");

const post = (body: Record<string, unknown> = {}) =>
  POST(new NextRequest("http://localhost/api/briefs/balance", { method: "POST", headers: { authorization: "Bearer t" }, body: JSON.stringify({ briefId: BRIEF_ID, ...body }) }));
const oneOffAnswers = { ...DEFAULT_WEBSITE_ANSWERS, mode: "oneOff", want: "oneOff" };

beforeEach(() => {
  state.writes = [];
  state.sessions = [];
  state.created = [];
  state.open = [];
  state.paid = [{ id: "dep-1" }];
  state.limited = false;
  state.stripeKey = "sk_test_123";
  state.user = { id: "c1", email: "Owner@Cafe.co.uk", email_confirmed_at: "2026-11-01" };
  state.brief = { id: BRIEF_ID, tenant_id: "t1", reference: "WNJO-ABC123", email: "owner@cafe.co.uk", name: "Sam", business_name: "Cafe Sam", route: "proposal", stage: "approval", balance_paid_at: null };
  state.proposal = { one_off_pence: 250001 };
  state.enquiry = { answers: { type: "website", answers: oneOffAnswers } };
});

describe("paying the balance on a website bought outright", () => {
  it("charges the agreed price minus the deposit, taken only from the accepted proposal", async () => {
    const res = await post({ amount: 1, pence: 1 });
    expect(res.status).toBe(200);
    expect((await res.json()).url).toMatch(/^https:\/\/checkout\.stripe\.com/);
    // 250001 total: the deposit rounds to 125001, so the balance is 125000 and the two always add up.
    expect(state.created[0]).toMatchObject({ overrides: { oneOff: 1250 }, packageName: "Final payment for your website" });
    const params = state.sessions[0];
    expect(params.get("line_items[0][price_data][unit_amount]")).toBe("125000");
    expect(params.get("metadata[payment_part]")).toBe("balance");
    expect(params.get("mode")).toBe("payment");
  });

  it("reuses an open final-payment offer for the same amount", async () => {
    state.open = [{ id: "off-1", reference: "WS-OLD111", one_off_pence: 125000, offer_expires_at: new Date(Date.now() + 86_400_000).toISOString() }];
    expect((await post()).status).toBe(200);
    expect(state.created).toEqual([]);
    expect(state.sessions[0].get("metadata[website_subscription_id]")).toBe("off-1");
  });

  it("closes an older offer for a different amount", async () => {
    state.open = [{ id: "off-1", reference: "WS-OLD111", one_off_pence: 99999, offer_expires_at: new Date(Date.now() + 86_400_000).toISOString() }];
    expect((await post()).status).toBe(200);
    expect(state.writes).toContainEqual({ table: "website_subscriptions", op: "update", payload: { status: "expired" } });
    expect(state.created).toHaveLength(1);
  });

  it("opens only once the customer has approved the website", async () => {
    for (const stage of ["building", "preview", "changes", "awaiting_payment"]) {
      state.brief = { ...state.brief, stage };
      expect((await post()).status).toBe(409);
    }
    expect(state.sessions).toEqual([]);
  });

  it("needs the deposit to really be paid first", async () => {
    state.paid = [];
    const res = await post();
    expect(res.status).toBe(409);
    expect((await res.json()).error).toMatch(/deposit/);
    expect(state.sessions).toEqual([]);
  });

  it("can't be paid twice", async () => {
    state.brief = { ...state.brief, balance_paid_at: "2026-11-20T10:00:00Z" };
    expect((await post()).status).toBe(409);
    expect(state.sessions).toEqual([]);
  });

  it("is only for a website bought outright, never a monthly plan", async () => {
    state.enquiry = { answers: { type: "website", answers: { ...DEFAULT_WEBSITE_ANSWERS, mode: "monthly", want: "monthly" } } };
    expect((await post()).status).toBe(409);
    state.enquiry = { answers: { type: "website", answers: oneOffAnswers } };
    state.brief = { ...state.brief, route: "package" };
    expect((await post()).status).toBe(409);
    expect(state.sessions).toEqual([]);
  });

  it("needs an accepted proposal with a price", async () => {
    state.proposal = null;
    expect((await post()).status).toBe(409);
    state.proposal = { one_off_pence: 0 };
    expect((await post()).status).toBe(409);
  });

  it("treats someone else's website as missing, and needs a signed-in customer", async () => {
    state.user = { id: "c2", email: "other@example.com", email_confirmed_at: "2026-11-01" };
    expect((await post()).status).toBe(404);
    state.user = null;
    expect((await post()).status).toBe(401);
    expect(state.sessions).toEqual([]);
  });

  it("stops when payments aren't connected or the customer is going too fast", async () => {
    state.stripeKey = null;
    expect((await post()).status).toBe(503);
    state.stripeKey = "sk_test_123";
    state.limited = true;
    expect((await post()).status).toBe(429);
  });
});
