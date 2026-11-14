import { beforeEach, describe, expect, it, vi } from "vitest";

const state: { brief: unknown; saved: unknown; upserts: { table: string; row: Record<string, unknown> }[]; limited: boolean; signedIn: boolean } = { brief: null, saved: null, upserts: [], limited: false, signedIn: true };
vi.mock("server-only", () => ({}));

vi.mock("@/lib/quote-store", () => ({
  serviceClient: () => ({
    from(table: string) {
      const b: Record<string, unknown> = {};
      for (const m of ["select", "eq"]) b[m] = () => b;
      b.maybeSingle = async () => ({ data: table === "website_briefs" ? state.brief : state.saved, error: null });
      b.upsert = async (row: Record<string, unknown>) => (state.upserts.push({ table, row }), { error: null });
      return b;
    },
  }),
}));
vi.mock("@/lib/rate-limit-shared", () => ({ LIMITS_PER_ROUTE: { briefDraft: { max: 120, windowSeconds: 600 } }, sharedRateLimited: async () => state.limited }));
vi.mock("@/lib/staff-auth", () => ({ customerFromRequest: async () => (state.signedIn ? { userId: "c1", email: "owner@shop.co.uk" } : null) }));

import { briefPassKey, issueBriefPass } from "@/lib/brief-pass";
import { POST } from "./route";

const ID = "11111111-1111-4111-8111-111111111111";
const call = (body: unknown) => POST(new Request("https://winjo.test/api/briefs/progress", { method: "POST", headers: { authorization: "Bearer x" }, body: JSON.stringify(body) }) as never);
const progress = { name: "Sam", businessName: "Shop", step: "goals", brief: { goals: ["bookings"] } };

beforeEach(() => {
  state.brief = { email: "Owner@Shop.co.uk", tenant_id: "t1", stage: "specification" };
  state.saved = null;
  state.upserts = [];
  state.limited = false;
  state.signedIn = true;
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-key");
});

describe("saving progress through the details form", () => {
  it("saves cleaned progress for the owner, in their own agency's table row", async () => {
    const res = await call({ briefId: ID, action: "save", progress: { ...progress, name: "<b>Sam</b>" } });
    expect(res.status).toBe(200);
    expect(state.upserts).toHaveLength(1);
    expect(state.upserts[0].table).toBe("website_brief_progress");
    expect(state.upserts[0].row).toMatchObject({ brief_id: ID, tenant_id: "t1", step: "goals" });
    expect((state.upserts[0].row.payload as { name: string }).name).toBe("Sam");
  });

  it("loads what was saved, or null when nothing was", async () => {
    state.saved = { payload: progress, step: "goals" };
    expect(((await (await call({ briefId: ID, action: "load" })).json()) as { progress: { step: string } }).progress.step).toBe("goals");
    state.saved = null;
    expect(await (await call({ briefId: ID, action: "load" })).json()).toEqual({ progress: null });
  });

  it("is only for the website's owner", async () => {
    state.brief = { email: "other@shop.co.uk", tenant_id: "t1", stage: "specification" };
    expect((await call({ briefId: ID, action: "save", progress })).status).toBe(404);
    expect(state.upserts).toEqual([]);
  });

  it("stops once the details can no longer be filled in", async () => {
    state.brief = { email: "owner@shop.co.uk", tenant_id: "t1", stage: "preview" };
    expect((await call({ briefId: ID, action: "save", progress })).status).toBe(409);
  });

  it("refuses an oversized save, a bad request, and a rate-limited one", async () => {
    expect((await call({ briefId: ID, action: "save", progress: { brief: { goalNote: "x".repeat(70_000) } } })).status).toBe(413);
    expect((await call({ briefId: "nope", action: "save", progress })).status).toBe(422);
    expect((await call({ briefId: ID, action: "wipe" })).status).toBe(422);
    state.limited = true;
    expect((await call({ briefId: ID, action: "load" })).status).toBe(429);
    expect(state.upserts).toEqual([]);
  });
});

describe("saving progress with a brief pass, before signing in", () => {
  const OTHER = "22222222-2222-4222-8222-222222222222";
  const pass = (id = ID) => issueBriefPass(id, briefPassKey()!)!;
  const withPass = (body: Record<string, unknown>) => POST(new Request("https://winjo.test/api/briefs/progress", { method: "POST", body: JSON.stringify(body) }) as never);
  beforeEach(() => {
    state.signedIn = false;
    state.brief = { email: "owner@shop.co.uk", tenant_id: "t1", stage: "brief_received", route: "proposal" };
  });

  it("can save progress on a buy-outright brief that hasn't been sent", async () => {
    expect((await withPass({ briefId: ID, action: "save", progress, pass: pass() })).status).toBe(200);
    expect(state.upserts).toHaveLength(1);
  });

  it("can never read progress back, even with a valid pass", async () => {
    state.saved = { payload: progress, step: "goals" };
    const res = await withPass({ briefId: ID, action: "load", pass: pass() });
    expect(res.status).toBe(401);
    expect(JSON.stringify(await res.json())).not.toContain("Sam");
  });

  it("refuses no pass, a made-up pass, and a pass made for another brief", async () => {
    for (const p of [undefined, "nope", pass(OTHER)]) expect((await withPass({ briefId: ID, action: "save", progress, pass: p })).status).toBe(401);
    expect(state.upserts).toEqual([]);
  });

  it("stops working once the brief has been sent, and never works on a monthly plan's brief", async () => {
    state.brief = { email: "owner@shop.co.uk", tenant_id: "t1", stage: "reviewing", route: "proposal" };
    expect((await withPass({ briefId: ID, action: "save", progress, pass: pass() })).status).toBe(401);
    state.brief = { email: "owner@shop.co.uk", tenant_id: "t1", stage: "brief_received", route: "package" };
    expect((await withPass({ briefId: ID, action: "save", progress, pass: pass() })).status).toBe(401);
    expect(state.upserts).toEqual([]);
  });
});
