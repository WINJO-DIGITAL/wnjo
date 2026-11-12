import { beforeEach, describe, expect, it, vi } from "vitest";

const state: { brief: unknown; signed: { signedUrl: string } | null; lastOptions: unknown; lastPath: string } = { brief: null, signed: { signedUrl: "https://signed.example/f" }, lastOptions: undefined, lastPath: "" };

vi.mock("@/lib/quote-store", () => ({
  serviceClient: () => ({
    from() {
      const b: Record<string, unknown> = {};
      for (const m of ["select", "eq"]) b[m] = () => b;
      b.maybeSingle = async () => ({ data: state.brief, error: null });
      return b;
    },
    storage: { from: () => ({ createSignedUrl: async (path: string, _s: number, options?: unknown) => ((state.lastPath = path), (state.lastOptions = options), { data: state.signed, error: state.signed ? null : new Error("x") }) }) },
  }),
}));
vi.mock("@/lib/rate-limit-shared", () => ({ LIMITS_PER_ROUTE: { checkout: { max: 10, windowSeconds: 60 } }, sharedRateLimited: async () => false }));
vi.mock("@/lib/staff-auth", () => ({ customerFromRequest: async () => ({ userId: "c1", email: "owner@shop.co.uk" }) }));

import { POST } from "./route";

const ID = "11111111-1111-4111-8111-111111111111";
const call = (body: unknown) => POST(new Request("https://winjo.test/api/briefs/file", { method: "POST", headers: { authorization: "Bearer x" }, body: JSON.stringify(body) }) as never);
const img = { path: "drafts/d/logo.png", name: "logo.png", size: 10, type: "image/png" };
const doc = { path: "drafts/d/menu.docx", name: "menu.docx", size: 10, type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" };

beforeEach(() => {
  state.brief = { email: "Owner@Shop.co.uk", brief: { files: [img, doc] } };
  state.signed = { signedUrl: "https://signed.example/f" };
  state.lastOptions = undefined;
});

describe("a customer's file link", () => {
  it("gives the owner a short-lived link, inline for an image", async () => {
    const res = await call({ briefId: ID, path: img.path });
    expect(await res.json()).toEqual({ url: "https://signed.example/f" });
    expect(state.lastOptions).toBeUndefined();
  });

  it("offers a download for types that aren't safe to show in a tab", async () => {
    await call({ briefId: ID, path: doc.path });
    expect(state.lastOptions).toEqual({ download: "menu.docx" });
  });

  it("refuses a path that is not one of this website's files", async () => {
    expect((await call({ briefId: ID, path: "drafts/other/secret.png" })).status).toBe(404);
  });

  it("refuses someone else's website", async () => {
    state.brief = { email: "other@shop.co.uk", brief: { files: [img] } };
    expect((await call({ briefId: ID, path: img.path })).status).toBe(404);
  });

  it("rejects a bad request", async () => {
    expect((await call({ briefId: "nope", path: img.path })).status).toBe(422);
    expect((await call({ briefId: ID })).status).toBe(422);
  });

  it("looks like nothing is there when storage can't sign it", async () => {
    state.signed = null;
    expect((await call({ briefId: ID, path: img.path })).status).toBe(404);
  });
});
