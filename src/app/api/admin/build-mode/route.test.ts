import { beforeEach, describe, expect, it, vi } from "vitest";

const state: { staff: { userId: string; email: string; tenantId: string; role: string } | null; mode: string; saved: string[]; audits: unknown[]; saveOk: boolean } = { staff: null, mode: "auto", saved: [], audits: [], saveOk: true };
vi.mock("server-only", () => ({}));
vi.mock("@/lib/quote-store", () => ({ serviceClient: () => ({ from: () => ({ insert: async (row: unknown) => (state.audits.push(row), { error: null }) }) }) }));
vi.mock("@/lib/staff-auth", () => ({ staffFromRequest: async () => state.staff }));
vi.mock("@/lib/website-build-mode", async (original) => ({
  ...(await original<typeof import("@/lib/website-build-mode")>()),
  getBuildMode: async () => state.mode,
  setBuildMode: async (_d: unknown, _t: string, m: string) => (state.saveOk ? (state.saved.push(m), (state.mode = m), true) : false),
}));

import { GET, POST } from "./route";

const req = (body?: unknown) => new Request("https://winjo.test/api/admin/build-mode", { method: body === undefined ? "GET" : "POST", headers: { authorization: "Bearer x" }, body: body === undefined ? undefined : JSON.stringify(body) }) as never;

beforeEach(() => {
  state.staff = { userId: "u1", email: "o@w.co.uk", tenantId: "t", role: "owner" };
  state.mode = "auto";
  state.saved = [];
  state.audits = [];
  state.saveOk = true;
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "k");
});

describe("how new websites are made", () => {
  it("shows the current mode to any signed-in member of staff", async () => {
    state.staff!.role = "staff";
    const res = await GET(req());
    expect(await res.json()).toEqual({ mode: "auto" });
  });

  it("refuses anyone who isn't signed in", async () => {
    state.staff = null;
    expect((await GET(req())).status).toBe(401);
    expect((await POST(req({ mode: "manual" }))).status).toBe(401);
  });

  it("lets an owner or admin switch it, and records who did", async () => {
    for (const role of ["owner", "admin"]) {
      state.staff!.role = role;
      state.mode = "auto";
      const res = await POST(req({ mode: "manual" }));
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ mode: "manual" });
    }
    expect(state.audits[0]).toMatchObject({ action: "website_build_mode.updated", actor_user_id: "u1", metadata: { from: "auto", to: "manual" } });
  });

  it("refuses staff, and anything that isn't a mode, and saves nothing", async () => {
    state.staff!.role = "staff";
    expect((await POST(req({ mode: "manual" }))).status).toBe(403);
    state.staff!.role = "owner";
    expect((await POST(req({ mode: "robot" }))).status).toBe(422);
    expect((await POST(req({}))).status).toBe(422);
    expect(state.saved).toEqual([]);
  });

  it("says so when the setting couldn't be saved", async () => {
    state.saveOk = false;
    expect((await POST(req({ mode: "manual" }))).status).toBe(500);
  });
});
