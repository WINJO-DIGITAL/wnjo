import { beforeEach, describe, expect, it, vi } from "vitest";

const state: { brief: unknown; enquiry: unknown } = { brief: null, enquiry: null };

vi.mock("@/lib/quote-store", () => ({
  serviceClient: () => ({
    from(table: string) {
      const b: Record<string, unknown> = {};
      for (const m of ["select", "eq"]) b[m] = () => b;
      b.maybeSingle = async () => ({ data: table === "website_briefs" ? state.brief : state.enquiry, error: null });
      return b;
    },
  }),
}));
vi.mock("@/lib/rate-limit-shared", () => ({ LIMITS_PER_ROUTE: { briefFeedback: { max: 20, windowSeconds: 600 } }, sharedRateLimited: async () => false }));
vi.mock("@/lib/staff-auth", () => ({ customerFromRequest: async () => ({ userId: "c1", email: "owner@shop.co.uk" }) }));

import { POST } from "./route";

const ID = "11111111-1111-4111-8111-111111111111";
const call = (body: unknown) => POST(new Request("https://winjo.test/api/briefs/known", { method: "POST", headers: { authorization: "Bearer x" }, body: JSON.stringify(body) }) as never);

beforeEach(() => {
  state.brief = { email: "Owner@Shop.co.uk", reference: "WNJO-ABC123", tenant_id: "t1" };
  state.enquiry = { answers: { type: "website", details: { phone: " 07700 900123 " } } };
});

describe("what the customer already told us", () => {
  it("returns the account email and the sign-up phone number to the owner", async () => {
    expect(await (await call({ briefId: ID })).json()).toEqual({ email: "owner@shop.co.uk", phone: "07700 900123" });
  });

  it("returns an empty phone when they didn't give one, or there is no sign-up record", async () => {
    state.enquiry = { answers: { type: "website", details: {} } };
    expect(await (await call({ briefId: ID })).json()).toEqual({ email: "owner@shop.co.uk", phone: "" });
    state.enquiry = null;
    expect(await (await call({ briefId: ID })).json()).toEqual({ email: "owner@shop.co.uk", phone: "" });
  });

  it("is only for the website's owner", async () => {
    state.brief = { email: "other@shop.co.uk", reference: "WNJO-ABC123", tenant_id: "t1" };
    expect((await call({ briefId: ID })).status).toBe(404);
  });

  it("rejects a bad request", async () => {
    expect((await call({ briefId: "nope" })).status).toBe(422);
  });
});
