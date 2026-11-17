import { beforeEach, describe, expect, it, vi } from "vitest";

const state: { brief: unknown; pack: { ok: true; url: string; files: number } | { ok: false; error: string } } = { brief: null, pack: { ok: true, url: "https://pack", files: 2 } };

vi.mock("@/lib/quote-store", () => ({
  serviceClient: () => ({
    from() {
      const b: Record<string, unknown> = {};
      for (const m of ["select", "eq"]) b[m] = () => b;
      b.maybeSingle = async () => ({ data: state.brief, error: null });
      return b;
    },
  }),
}));
vi.mock("@/lib/handover-pack-store", () => ({ createHandoverPack: async () => state.pack }));
vi.mock("@/lib/rate-limit-shared", () => ({ LIMITS_PER_ROUTE: { checkout: { max: 10, windowSeconds: 60 } }, sharedRateLimited: async () => false }));
vi.mock("@/lib/staff-auth", () => ({ customerFromRequest: async () => ({ userId: "c1", email: "owner@shop.co.uk" }) }));

import { POST } from "./route";

const call = (briefId: unknown = "11111111-1111-4111-8111-111111111111") =>
  POST(new Request("https://winjo.test/api/briefs/handover-pack", { method: "POST", headers: { authorization: "Bearer x" }, body: JSON.stringify({ briefId }) }) as never);

const handedOver = { id: "b1", email: "Owner@Shop.co.uk", route: "proposal", handed_over_at: "2026-11-21T10:00:00Z" };

beforeEach(() => {
  state.brief = handedOver;
  state.pack = { ok: true, url: "https://pack", files: 2 };
});

describe("a customer's website pack", () => {
  it("gives the owner a link once the website has been handed over", async () => {
    const res = await call();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ url: "https://pack" });
  });

  it("is not found before the handover", async () => {
    state.brief = { ...handedOver, handed_over_at: null };
    expect((await call()).status).toBe(404);
  });

  it("is not found for someone else's website", async () => {
    state.brief = { ...handedOver, email: "other@shop.co.uk" };
    expect((await call()).status).toBe(404);
  });

  it("is not found for a monthly plan, which has no handover", async () => {
    state.brief = { ...handedOver, route: "package" };
    expect((await call()).status).toBe(404);
  });

  it("refuses a request with no valid website id", async () => {
    expect((await call("nope")).status).toBe(422);
  });

  it("passes on a plain message when the pack can't be made", async () => {
    state.pack = { ok: false, error: "The pack couldn't be saved." };
    const res = await call();
    expect(res.status).toBe(502);
    expect((await res.json()).error).toBe("The pack couldn't be saved.");
  });
});
