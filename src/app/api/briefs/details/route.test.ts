import { beforeEach, describe, expect, it, vi } from "vitest";

const state: { brief: unknown; writes: { table: string; op: string }[]; signedIn: boolean } = { brief: null, writes: [], signedIn: true };
vi.mock("server-only", () => ({}));

vi.mock("@/lib/quote-store", () => ({
  serviceClient: () => ({
    from(table: string) {
      let op = "select";
      const b: Record<string, unknown> = {};
      for (const m of ["select", "eq", "order", "limit"]) b[m] = () => b;
      b.update = () => ((op = "update"), b);
      b.insert = () => ((op = "insert"), b);
      b.delete = () => ((op = "delete"), b);
      b.maybeSingle = async () => ({ data: table === "website_briefs" ? state.brief : null, error: null });
      b.then = (res: (v: unknown) => unknown) => {
        if (op !== "select") state.writes.push({ table, op });
        return Promise.resolve({ data: [], error: null }).then(res);
      };
      return b;
    },
  }),
}));
vi.mock("@/lib/rate-limit-shared", () => ({ LIMITS_PER_ROUTE: { briefFeedback: { max: 20, windowSeconds: 600 } }, sharedRateLimited: async () => false }));
vi.mock("@/lib/staff-auth", () => ({ customerFromRequest: async () => (state.signedIn ? { userId: "c1", email: "owner@shop.co.uk" } : null) }));
vi.mock("@/lib/mailer", () => ({ mailConfig: () => null, sendEnquiryEmail: async () => true, notificationMailConfig: () => null, sendEmail: async () => true }));
vi.mock("@/lib/brief-store", () => ({ confirmBriefFiles: async (_d: unknown, _id: string, b: unknown) => b }));

import { issueBriefPass, briefPassKey } from "@/lib/brief-pass";
import { POST } from "./route";

const ID = "11111111-1111-4111-8111-111111111111";
const row = (pkg: string) => ({ id: ID, tenant_id: "t1", reference: "WNJO-ABC123", email: "Owner@Shop.co.uk", name: "Sam", stage: "specification", route: "package", answers: {}, figures: { package: pkg } });
const pages = (n: number) => Array.from({ length: n }, (_, i) => `Page ${i + 1}`);
const send = (pageList: string[]) =>
  POST(new Request("https://winjo.test/api/briefs/details", { method: "POST", headers: { authorization: "Bearer x" }, body: JSON.stringify({ briefId: ID, name: "Sam", businessName: "Shop", brief: { goals: ["bookings"], pages: pageList } }) }) as never);

beforeEach(() => {
  state.brief = row("Core");
  state.writes = [];
  state.signedIn = true;
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-key");
});

describe("the details form and the plan's page limit", () => {
  it("saves a brief within the plan's limit", async () => {
    expect((await send(pages(5))).status).toBe(200);
    expect(state.writes.some((w) => w.table === "website_briefs" && w.op === "update")).toBe(true);
  });

  it("refuses more pages than Core covers, says how many to remove, and saves nothing", async () => {
    const res = await send(pages(6));
    expect(res.status).toBe(422);
    const json = (await res.json()) as { error: string; allowed: number };
    expect(json.error).toBe("Your plan covers up to 5 pages. Remove 1 to continue.");
    expect(json.allowed).toBe(5);
    expect(state.writes).toEqual([]);
  });

  it("gives Plus 10 pages and Pro 20", async () => {
    state.brief = row("Plus");
    expect((await send(pages(10))).status).toBe(200);
    expect((await send(pages(11))).status).toBe(422);
    state.brief = row("Pro");
    expect((await send(pages(20))).status).toBe(200);
    expect((await send(pages(21))).status).toBe(422);
  });
});

describe("answering the six questions straight after the short form, with a brief pass", () => {
  const OTHER = "22222222-2222-4222-8222-222222222222";
  const goodPass = (id = ID, now = Date.now()) => issueBriefPass(id, briefPassKey()!, now)!;
  const fresh = () => ({ ...row("Core"), route: "proposal", stage: "brief_received" });
  const sendWith = (pass: unknown, briefId = ID) =>
    POST(new Request("https://winjo.test/api/briefs/details", { method: "POST", body: JSON.stringify({ briefId, pass, name: "Sam", businessName: "Shop", brief: { goals: ["bookings"], pages: pages(6) } }) }) as never);
  beforeEach(() => {
    state.signedIn = false;
    state.brief = fresh();
  });

  it("saves the answers of a buy-outright brief that hasn't been sent, without signing in", async () => {
    const res = await sendWith(goodPass());
    expect(res.status).toBe(200);
    expect(state.writes.some((w) => w.table === "website_briefs" && w.op === "update")).toBe(true);
  });

  it("needs a pass: nothing at all is refused, and so is a made-up one", async () => {
    for (const pass of [undefined, "", "nope", `${ID}.9999999999999.abc`]) expect((await sendWith(pass)).status).toBe(401);
    expect(state.writes).toEqual([]);
  });

  it("refuses a pass made for another brief, and one that has expired", async () => {
    expect((await sendWith(goodPass(OTHER))).status).toBe(401);
    expect((await sendWith(goodPass(ID, Date.now() - 49 * 3_600_000))).status).toBe(401);
    expect(state.writes).toEqual([]);
  });

  it("stops working once the brief has been sent", async () => {
    state.brief = { ...fresh(), stage: "reviewing" };
    expect((await sendWith(goodPass())).status).toBe(401);
    expect(state.writes).toEqual([]);
  });

  it("is only for a buy-outright brief, never a monthly plan's", async () => {
    state.brief = { ...fresh(), route: "package" };
    expect((await sendWith(goodPass())).status).toBe(401);
    expect(state.writes).toEqual([]);
  });

  it("doesn't weaken signing in: a signed-in customer still can't use someone else's brief", async () => {
    state.signedIn = true;
    state.brief = { ...fresh(), email: "someone@else.co.uk" };
    expect((await sendWith(undefined)).status).toBe(404);
  });
});
