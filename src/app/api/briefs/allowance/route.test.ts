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
const call = (body: unknown) => POST(new Request("https://winjo.test/api/briefs/allowance", { method: "POST", headers: { authorization: "Bearer x" }, body: JSON.stringify(body) }) as never);
const brief = (pkg: string) => ({ email: "Owner@Shop.co.uk", reference: "WNJO-ABC123", tenant_id: "t1", figures: { package: pkg } });

beforeEach(() => {
  state.brief = brief("Core");
  state.enquiry = null;
});

describe("how many pages a website may have", () => {
  it("is 5 on Core, 10 on Plus and 20 on Pro", async () => {
    expect(await (await call({ briefId: ID })).json()).toEqual({ pages: 5 });
    state.brief = brief("Plus");
    expect(await (await call({ briefId: ID })).json()).toEqual({ pages: 10 });
    state.brief = brief("Pro");
    expect(await (await call({ briefId: ID })).json()).toEqual({ pages: 20 });
  });

  it("is only given to the website's owner", async () => {
    state.brief = { ...brief("Core"), email: "other@shop.co.uk" };
    expect((await call({ briefId: ID })).status).toBe(404);
  });

  it("rejects a bad request", async () => {
    expect((await call({ briefId: "nope" })).status).toBe(422);
  });
});
