import { beforeEach, describe, expect, it, vi } from "vitest";

const state: { brief: unknown; preview: unknown; site: unknown } = { brief: null, preview: null, site: null };

vi.mock("@/lib/quote-store", () => ({
  serviceClient: () => ({
    from(table: string) {
      const b: Record<string, unknown> = {};
      for (const m of ["select", "eq", "order", "limit"]) b[m] = () => b;
      b.maybeSingle = async () => ({ data: table === "website_briefs" ? state.brief : table === "website_previews" ? state.preview : state.site, error: null });
      return b;
    },
  }),
}));
vi.mock("@/lib/rate-limit-shared", () => ({ LIMITS_PER_ROUTE: { checkout: { max: 10, windowSeconds: 60 } }, sharedRateLimited: async () => false }));
vi.mock("@/lib/staff-auth", () => ({ customerFromRequest: async () => ({ userId: "c1", email: "owner@shop.co.uk" }) }));

import { POST } from "./route";

const call = (briefId = "11111111-1111-4111-8111-111111111111") =>
  POST(new Request("https://winjo.test/api/briefs/preview", { method: "POST", headers: { authorization: "Bearer x" }, body: JSON.stringify({ briefId }) }) as never);

beforeEach(() => {
  state.brief = { id: "b1", email: "Owner@Shop.co.uk" };
  state.preview = null;
  state.site = null;
});

describe("a customer's preview address", () => {
  it("is not found when nothing has been released", async () => {
    expect((await call()).status).toBe(404);
  });

  it("is not found for someone else's website", async () => {
    state.brief = { id: "b1", email: "other@shop.co.uk" };
    state.site = { access_token: "tok", released_at: "2026-11-12T10:00:00Z" };
    expect((await call()).status).toBe(404);
  });

  it("points at a released template build", async () => {
    state.site = { access_token: "sitetoken", released_at: "2026-11-12T10:00:00Z" };
    expect(await (await call()).json()).toEqual({ url: "https://winjo.test/site-preview/sitetoken" });
  });

  it("points at a released words-only preview", async () => {
    state.preview = { access_token: "pvtoken", released_at: "2026-11-12T10:00:00Z" };
    expect(await (await call()).json()).toEqual({ url: "https://winjo.test/preview/pvtoken" });
  });

  it("prefers whichever was released last", async () => {
    state.preview = { access_token: "pvtoken", released_at: "2026-11-10T10:00:00Z" };
    state.site = { access_token: "sitetoken", released_at: "2026-11-12T10:00:00Z" };
    expect((await (await call()).json()).url).toContain("/site-preview/sitetoken");
    state.preview = { access_token: "pvtoken", released_at: "2026-11-13T10:00:00Z" };
    expect((await (await call()).json()).url).toContain("/preview/pvtoken");
  });

  describe("a website the owner built by hand", () => {
    it("is the customer's preview, once the owner has sent its address", async () => {
      state.brief = { id: "b1", email: "Owner@Shop.co.uk", manual_preview_url: "https://dazs-cabs.vercel.app/", manual_preview_at: "2026-11-17T10:00:00Z" };
      expect(await (await call()).json()).toEqual({ url: "https://dazs-cabs.vercel.app/", external: true });
    });

    it("loses to a template build released after it, and wins against one released before", async () => {
      state.brief = { id: "b1", email: "Owner@Shop.co.uk", manual_preview_url: "https://dazs-cabs.vercel.app/", manual_preview_at: "2026-11-17T10:00:00Z" };
      state.site = { access_token: "newer", released_at: "2026-11-17T11:00:00Z" };
      expect(await (await call()).json()).toEqual({ url: "https://winjo.test/site-preview/newer" });
      state.site = { access_token: "older", released_at: "2026-11-16T11:00:00Z" };
      expect((await (await call()).json()).external).toBe(true);
    });

    it("is never handed out for someone else's website, or when it isn't https", async () => {
      state.brief = { id: "b1", email: "other@shop.co.uk", manual_preview_url: "https://dazs-cabs.vercel.app/", manual_preview_at: "x" };
      expect((await call()).status).toBe(404);
      state.brief = { id: "b1", email: "Owner@Shop.co.uk", manual_preview_url: "http://insecure.example.com", manual_preview_at: "x" };
      expect((await call()).status).toBe(404);
    });

    it("is gone once the owner takes it back", async () => {
      state.brief = { id: "b1", email: "Owner@Shop.co.uk", manual_preview_url: null, manual_preview_at: "2026-11-17T10:00:00Z" };
      expect((await call()).status).toBe(404);
    });
  });
});
