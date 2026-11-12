import { beforeEach, describe, expect, it, vi } from "vitest";

const state: { sub: unknown; open: unknown; inserts: Record<string, unknown>[]; insertError: { code: string } | null; mail: { apiKey: string; from: string } | null; sent: { to: string; subject: string; text: string }[]; limited: boolean } = {
  sub: null, open: null, inserts: [], insertError: null, mail: { apiKey: "k", from: "f@winjo.test" }, sent: [], limited: false,
};

vi.mock("@/lib/quote-store", () => ({
  serviceClient: () => ({
    from(table: string) {
      const b: Record<string, unknown> = {};
      for (const m of ["select", "eq"]) b[m] = () => b;
      b.maybeSingle = async () => ({ data: table === "website_subscriptions" ? state.sub : state.open, error: null });
      b.insert = async (row: Record<string, unknown>) => (state.insertError ? { error: state.insertError } : (state.inserts.push(row), { error: null }));
      return b;
    },
  }),
}));
vi.mock("@/lib/rate-limit-shared", () => ({ LIMITS_PER_ROUTE: { checkout: { max: 10, windowSeconds: 600 } }, sharedRateLimited: async () => state.limited }));
vi.mock("@/lib/staff-auth", () => ({ customerFromRequest: async () => ({ userId: "c1", email: "owner@shop.co.uk" }) }));
vi.mock("@/lib/mailer", () => ({ notificationMailConfig: () => state.mail, sendEmail: async (_c: unknown, m: { to: string; subject: string; text: string }) => (state.sent.push(m), true) }));

import { POST } from "./route";

const sub = { id: "s1", tenant_id: "t1", reference: "WS-ABC123", kind: "subscription", status: "active", email: "Owner@Shop.co.uk", name: "Sam Lee", package_name: "Plus", minimum_term_months: 12, monthly_pence: 14900, ownership_after_payments: 12, cancel_at_period_end: false };
const call = (body: unknown) => POST(new Request("https://winjo.test/api/account/cancel-request", { method: "POST", headers: { authorization: "Bearer x" }, body: JSON.stringify(body) }) as never);

beforeEach(() => {
  state.sub = { ...sub };
  state.open = null;
  state.inserts = [];
  state.insertError = null;
  state.mail = { apiKey: "k", from: "f@winjo.test" };
  state.sent = [];
  state.limited = false;
  process.env.ENQUIRY_TO_EMAIL = "staff@winjo.test";
});

describe("asking to cancel a plan", () => {
  it("records the request with the reason, and emails the customer and staff", async () => {
    const res = await call({ reference: "WS-ABC123", action: "request", reason: "too_expensive", comment: "Too much" });
    expect(await res.json()).toEqual({ ok: true });
    expect(state.inserts).toEqual([{ tenant_id: "t1", subscription_id: "s1", reason: "It costs too much · Too much", status: "open" }]);
    expect(state.sent.map((m) => m.to).sort()).toEqual(["Owner@Shop.co.uk", "staff@winjo.test"]);
    expect(state.sent.find((m) => m.to === "Owner@Shop.co.uk")?.subject).toContain("We've received your cancellation request");
  });

  it("lets a customer ask with no reason at all", async () => {
    expect((await call({ reference: "WS-ABC123", action: "request" })).status).toBe(200);
    expect(state.inserts[0]).toMatchObject({ reason: "" });
  });

  it("does nothing new when a request is already open", async () => {
    state.open = { id: "r1" };
    expect(await (await call({ reference: "WS-ABC123", action: "request" })).json()).toEqual({ ok: true, alreadyRequested: true });
    expect(state.inserts).toEqual([]);
    expect(state.sent).toEqual([]);
  });

  it("treats two requests at once as one", async () => {
    state.insertError = { code: "23505" };
    expect(await (await call({ reference: "WS-ABC123", action: "request" })).json()).toEqual({ ok: true, alreadyRequested: true });
    expect(state.sent).toEqual([]);
  });

  it("reports whether a plan can be asked about, and whether a request is open", async () => {
    expect(await (await call({ reference: "WS-ABC123", action: "status" })).json()).toEqual({ canRequest: true, requested: false });
    state.open = { id: "r1" };
    expect(await (await call({ reference: "WS-ABC123", action: "status" })).json()).toEqual({ canRequest: true, requested: true });
  });

  it("refuses a plan that can't be cancelled from here", async () => {
    state.sub = { ...sub, kind: "one_off", status: "paid" };
    expect((await call({ reference: "WS-ABC123", action: "request" })).status).toBe(409);
    state.sub = { ...sub, cancel_at_period_end: true };
    expect((await call({ reference: "WS-ABC123", action: "request" })).status).toBe(409);
    expect(state.inserts).toEqual([]);
  });

  it("is only for the plan's own owner", async () => {
    state.sub = { ...sub, email: "other@shop.co.uk" };
    expect((await call({ reference: "WS-ABC123", action: "request" })).status).toBe(404);
    expect(state.inserts).toEqual([]);
  });

  it("rejects a bad request and a rate-limited one", async () => {
    expect((await call({ reference: "nope", action: "request" })).status).toBe(422);
    expect((await call({ reference: "WS-ABC123", action: "wipe" })).status).toBe(422);
    state.limited = true;
    expect((await call({ reference: "WS-ABC123", action: "request" })).status).toBe(429);
  });

  it("still records the request when email isn't set up", async () => {
    state.mail = null;
    expect((await call({ reference: "WS-ABC123", action: "request" })).status).toBe(200);
    expect(state.inserts).toHaveLength(1);
    expect(state.sent).toEqual([]);
  });
});
