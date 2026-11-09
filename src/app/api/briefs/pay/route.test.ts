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
  open: [] as Record<string, unknown>[],
  limited: false,
  stripeKey: "sk_test_123" as string | null,
  stripeFails: false,
  sessions: [] as URLSearchParams[],
  created: [] as Record<string, unknown>[],
}));

function builder(table: string) {
  let op = "select";
  let payload: unknown;
  const b: Record<string, unknown> = {};
  for (const m of ["select", "eq", "order", "limit"]) b[m] = () => b;
  b.update = (p: unknown) => ((op = "update"), (payload = p), b);
  b.maybeSingle = async () => ({
    data: table === "website_briefs" ? state.brief : table === "website_proposals" ? state.proposal : table === "enquiries" ? state.enquiry : null,
    error: null,
  });
  b.then = (res: (v: unknown) => unknown) => {
    if (op === "update") state.writes.push({ table, op, payload });
    return Promise.resolve({ data: op === "select" && table === "website_subscriptions" ? state.open : [], error: null }).then(res);
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
    if (state.stripeFails) throw new Error("Stripe down");
    state.sessions.push(params);
    return { id: "cs_test_1", url: "https://checkout.stripe.com/c/pay/cs_test_1", livemode: false };
  },
}));
const { POST } = await import("./route");

const post = (body: Record<string, unknown>) =>
  POST(new NextRequest("http://localhost/api/briefs/pay", { method: "POST", headers: { authorization: "Bearer t" }, body: JSON.stringify({ briefId: BRIEF_ID, agree: true, ...body }) }));
const oneOffAnswers = { ...DEFAULT_WEBSITE_ANSWERS, mode: "oneOff", want: "oneOff" };

beforeEach(() => {
  state.writes = [];
  state.sessions = [];
  state.created = [];
  state.open = [];
  state.limited = false;
  state.stripeKey = "sk_test_123";
  state.stripeFails = false;
  state.user = { id: "c1", email: "Owner@Cafe.co.uk", email_confirmed_at: "2026-11-01" };
  state.brief = { id: BRIEF_ID, tenant_id: "t1", reference: "WNJO-ABC123", email: "owner@cafe.co.uk", name: "Sam", business_name: "Cafe Sam", route: "proposal", stage: "awaiting_payment" };
  state.proposal = { setup_pence: 0, monthly_pence: 0, one_off_pence: 250001 };
  state.enquiry = { answers: { type: "website", answers: oneOffAnswers } };
});

describe("customer pays after accepting a bespoke proposal", () => {
  it("charges 50% of the accepted one-off price, in one payment, from the proposal only", async () => {
    const res = await post({ amount: 1 });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ url: "https://checkout.stripe.com/c/pay/cs_test_1" });
    expect(state.created[0]).toMatchObject({ enquiryReference: "WNJO-ABC123", email: "owner@cafe.co.uk", createdBy: null, overrides: { oneOff: 1250.01 } });
    expect((state.created[0].consent as { agreedAt: string }).agreedAt).toBeTruthy();
    const p = state.sessions[0];
    expect(p.get("mode")).toBe("payment");
    expect(p.get("line_items[0][price_data][unit_amount]")).toBe("125001");
    expect(p.get("customer_email")).toBe("owner@cafe.co.uk");
    expect(p.get("success_url")).toBe("http://localhost/subscribe/done?session_id={CHECKOUT_SESSION_ID}");
    expect(p.get("cancel_url")).toBe("http://localhost/account#builds");
  });

  it("charges the first payment (setup, extras and first month) for a monthly bespoke proposal", async () => {
    state.enquiry = { answers: { type: "website", answers: { ...DEFAULT_WEBSITE_ANSWERS, plan: "gold" } } };
    state.proposal = { setup_pence: 19900, monthly_pence: 29900, one_off_pence: 10000 };
    expect((await post({})).status).toBe(200);
    const p = state.sessions[0];
    expect(p.get("mode")).toBe("subscription");
    expect(p.get("line_items[0][price_data][unit_amount]")).toBe("29900");
    expect(p.get("line_items[1][price_data][unit_amount]")).toBe("29900");
  });

  it("reuses an open offer with exactly the same amounts instead of making another", async () => {
    state.open = [{ id: "off-1", reference: "WS-OLD111", kind: "one_off", setup_pence: 0, monthly_pence: 0, one_off_pence: 125001, offer_expires_at: new Date(Date.now() + 86_400_000).toISOString() }];
    expect((await post({})).status).toBe(200);
    expect(state.created).toEqual([]);
    expect(state.writes).toEqual([]);
    expect(state.sessions[0].get("client_reference_id")).toBe("off-1");
  });

  it("closes an older open offer with different amounts and makes a new one", async () => {
    state.open = [{ id: "off-old", reference: "WS-OLD111", kind: "one_off", setup_pence: 0, monthly_pence: 0, one_off_pence: 99900, offer_expires_at: new Date(Date.now() + 86_400_000).toISOString() }];
    expect((await post({})).status).toBe(200);
    expect(state.writes[0]).toMatchObject({ table: "website_subscriptions", op: "update", payload: { status: "expired" } });
    expect(state.created).toHaveLength(1);
    expect(state.sessions[0].get("client_reference_id")).toBe("off-new");
  });

  it("needs the customer to agree to the terms", async () => {
    expect((await post({ agree: false })).status).toBe(422);
    expect((await post({ agree: "yes" })).status).toBe(422);
    expect(state.sessions).toEqual([]);
  });
});

describe("who can pay, and when", () => {
  it("treats someone else's build as missing", async () => {
    state.user = { id: "c2", email: "other@example.com", email_confirmed_at: "2026-11-01" };
    expect((await post({})).status).toBe(404);
    expect(state.sessions).toEqual([]);
  });

  it("needs a signed-in customer with a confirmed email", async () => {
    state.user = { id: "c1", email: "owner@cafe.co.uk", email_confirmed_at: null };
    expect((await post({})).status).toBe(401);
    state.user = null;
    expect((await post({})).status).toBe(401);
  });

  it("only takes payment once the proposal is accepted and the build is awaiting payment", async () => {
    for (const stage of ["brief_received", "proposal", "specification", "live"]) {
      state.brief = { ...state.brief!, stage };
      expect((await post({})).status).toBe(409);
    }
    state.brief = { ...state.brief!, stage: "awaiting_payment", route: "package" };
    expect((await post({})).status).toBe(409);
    state.brief = { ...state.brief!, route: "proposal" };
    state.proposal = null;
    expect((await post({})).status).toBe(409);
    expect(state.sessions).toEqual([]);
  });

  it("can't continue without the quote's details", async () => {
    state.enquiry = null;
    expect((await post({})).status).toBe(422);
  });

  it("rejects a malformed request, a limited customer, and payments that aren't switched on", async () => {
    expect((await post({ briefId: "nope" })).status).toBe(422);
    state.limited = true;
    expect((await post({})).status).toBe(429);
    state.limited = false;
    state.stripeKey = null;
    expect((await post({})).status).toBe(503);
  });

  it("reports a Stripe failure without leaking the reason", async () => {
    state.stripeFails = true;
    const res = await post({});
    expect(res.status).toBe(502);
    expect(JSON.stringify(await res.json())).not.toContain("Stripe down");
  });
});
