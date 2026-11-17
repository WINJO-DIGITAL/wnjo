import { beforeEach, describe, expect, it, vi } from "vitest";

const state: { brief: unknown; updates: unknown[]; events: unknown[] } = { brief: null, updates: [], events: [] };

vi.mock("@/lib/quote-store", () => ({
  serviceClient: () => ({
    from(table: string) {
      const b: Record<string, unknown> = {};
      for (const m of ["select", "eq"]) b[m] = () => b;
      b.update = (p: unknown) => {
        state.updates.push({ table, p });
        return b;
      };
      b.insert = (p: unknown) => {
        state.events.push({ table, p });
        return Promise.resolve({ error: null });
      };
      b.maybeSingle = async () => ({ data: table === "website_briefs" ? state.brief : null, error: null });
      b.then = (res: (v: unknown) => unknown) => Promise.resolve({ error: null }).then(res);
      return b;
    },
  }),
}));
vi.mock("@/lib/rate-limit-shared", () => ({ LIMITS_PER_ROUTE: { briefFeedback: { max: 20, windowSeconds: 60 } }, sharedRateLimited: async () => false }));
vi.mock("@/lib/staff-auth", () => ({ customerFromRequest: async () => ({ userId: "c1", email: "owner@shop.co.uk" }) }));

import { POST } from "./route";

const BRIEF = "11111111-1111-4111-8111-111111111111";
const call = (body: Record<string, unknown>) =>
  POST(new Request("https://winjo.test/api/briefs/domain", { method: "POST", headers: { authorization: "Bearer x" }, body: JSON.stringify({ briefId: BRIEF, ...body }) }) as never);

beforeEach(() => {
  state.brief = { id: BRIEF, tenant_id: "t1", email: "Owner@Shop.co.uk", stage: "preview" };
  state.updates = [];
  state.events = [];
});

describe("the website address answer", () => {
  it("saves a name the customer already has", async () => {
    const res = await call({ choice: "have", name: "hartleyandsons.co.uk" });
    expect(res.status).toBe(200);
    expect(state.updates[0]).toMatchObject({ table: "website_briefs", p: { domain_choice: "have", domain_name: "hartleyandsons.co.uk" } });
    expect(state.events[0]).toMatchObject({ table: "website_brief_events", p: { actor_type: "customer", kind: "note" } });
  });

  it("saves a request for help, with no name", async () => {
    const res = await call({ choice: "help" });
    expect(res.status).toBe(200);
    expect(state.updates[0]).toMatchObject({ p: { domain_choice: "help", domain_name: null } });
  });

  it("refuses a bad name without saving", async () => {
    const res = await call({ choice: "have", name: "not a domain" });
    expect(res.status).toBe(422);
    expect(state.updates).toEqual([]);
  });

  it("is not found for someone else's website", async () => {
    state.brief = { id: BRIEF, tenant_id: "t1", email: "other@shop.co.uk", stage: "preview" };
    expect((await call({ choice: "help" })).status).toBe(404);
    expect(state.updates).toEqual([]);
  });

  it("is not accepted before a preview exists", async () => {
    state.brief = { id: BRIEF, tenant_id: "t1", email: "owner@shop.co.uk", stage: "specification" };
    expect((await call({ choice: "help" })).status).toBe(409);
    expect(state.updates).toEqual([]);
  });

  it("refuses a request with no website id", async () => {
    const res = await POST(new Request("https://winjo.test/api/briefs/domain", { method: "POST", headers: { authorization: "Bearer x" }, body: JSON.stringify({ choice: "help" }) }) as never);
    expect(res.status).toBe(422);
  });
});
