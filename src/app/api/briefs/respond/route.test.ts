import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

let user: Record<string, unknown> | null = null;
let proposal: Record<string, unknown> | null = null;
let writes: { table: string; payload: unknown }[] = [];
function builder(table: string) {
  let payload: unknown = undefined;
  const b: Record<string, unknown> = {};
  for (const m of ["select", "eq", "order", "limit"]) b[m] = () => b;
  b.update = (p: unknown) => ((payload = p), b);
  b.insert = async (p: unknown) => (writes.push({ table, payload: p }), { error: null });
  b.maybeSingle = async () => ({ data: proposal, error: null });
  b.then = (res: (v: unknown) => unknown) => {
    if (payload !== undefined) writes.push({ table, payload });
    return Promise.resolve({ data: [{ id: "x" }], error: null }).then(res);
  };
  return b;
}
const fakeDb = { from: builder, auth: { getUser: async () => ({ data: { user }, error: null }) } };
vi.mock("@/lib/quote-store", () => ({ serviceClient: () => fakeDb }));
vi.mock("@/lib/mailer", () => ({ mailConfig: () => null, sendEnquiryEmail: vi.fn() }));
const { POST } = await import("./route");

const ID = "11111111-1111-4111-8111-111111111111";
const post = (body: Record<string, unknown>) =>
  POST(new NextRequest("http://localhost/api/briefs/respond", { method: "POST", headers: { authorization: "Bearer t" }, body: JSON.stringify({ proposalId: ID, ...body }) }));

beforeEach(() => {
  writes = [];
  user = { id: "c1", email: "Owner@Cafe.co.uk", email_confirmed_at: "2026-11-01" };
  proposal = { id: ID, reference: "WP-1", status: "sent", brief_id: "b1", tenant_id: "t1", website_briefs: { email: "owner@cafe.co.uk", name: "Sam", stage: "proposal", reference: "WNJO-1" } };
});

describe("customer proposal response", () => {
  it("accepts the customer's own sent proposal and moves the brief to payment", async () => {
    const res = await post({ decision: "accept" });
    expect(res.status).toBe(200);
    expect(writes.find((w) => w.table === "website_proposals")?.payload).toMatchObject({ status: "accepted" });
    expect(writes.find((w) => w.table === "website_briefs")?.payload).toEqual({ stage: "awaiting_payment" });
  });

  it("treats someone else's proposal as missing", async () => {
    user = { id: "c2", email: "other@example.com", email_confirmed_at: "2026-11-01" };
    expect((await post({ decision: "accept" })).status).toBe(404);
    expect(writes).toEqual([]);
  });

  it("needs a confirmed email", async () => {
    user = { id: "c1", email: "owner@cafe.co.uk", email_confirmed_at: null };
    expect((await post({ decision: "accept" })).status).toBe(401);
  });

  it("can't answer a proposal twice or before it is sent", async () => {
    proposal = { ...proposal!, status: "accepted" };
    expect((await post({ decision: "decline", note: "Too much" })).status).toBe(409);
    proposal = { ...proposal!, status: "approved" };
    expect((await post({ decision: "accept" })).status).toBe(409);
    expect(writes).toEqual([]);
  });

  it("asking for changes needs a note, so staff know what to revise", async () => {
    const res = await post({ decision: "decline" });
    expect(res.status).toBe(422);
    expect(writes).toEqual([]);
  });

  it("declining leaves the stage alone", async () => {
    expect((await post({ decision: "decline", note: "Too much for now" })).status).toBe(200);
    expect(writes.some((w) => w.table === "website_briefs")).toBe(false);
  });
});
