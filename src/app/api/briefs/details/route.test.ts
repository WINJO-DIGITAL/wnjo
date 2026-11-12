import { beforeEach, describe, expect, it, vi } from "vitest";

const state: { brief: unknown; writes: { table: string; op: string }[] } = { brief: null, writes: [] };

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
vi.mock("@/lib/staff-auth", () => ({ customerFromRequest: async () => ({ userId: "c1", email: "owner@shop.co.uk" }) }));
vi.mock("@/lib/mailer", () => ({ mailConfig: () => null, sendEnquiryEmail: async () => true }));
vi.mock("@/lib/brief-store", () => ({ confirmBriefFiles: async (_d: unknown, _id: string, b: unknown) => b }));

import { POST } from "./route";

const ID = "11111111-1111-4111-8111-111111111111";
const row = (pkg: string) => ({ id: ID, tenant_id: "t1", reference: "WNJO-ABC123", email: "Owner@Shop.co.uk", name: "Sam", stage: "specification", answers: {}, figures: { package: pkg } });
const pages = (n: number) => Array.from({ length: n }, (_, i) => `Page ${i + 1}`);
const send = (pageList: string[]) =>
  POST(new Request("https://winjo.test/api/briefs/details", { method: "POST", headers: { authorization: "Bearer x" }, body: JSON.stringify({ briefId: ID, name: "Sam", businessName: "Shop", brief: { goals: ["bookings"], pages: pageList } }) }) as never);

beforeEach(() => {
  state.brief = row("Core");
  state.writes = [];
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
