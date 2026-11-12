import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/** A tiny stand-in for the Supabase client: each table answers from `tables`, and writes are recorded. */
type Op = { table: string; op: "select" | "insert" | "update"; payload?: unknown };
let tables: Record<string, unknown> = {};
let writes: Op[] = [];
let role: "owner" | "admin" | "staff" = "staff";
function builder(table: string) {
  let op: Op["op"] = "select";
  let payload: unknown;
  const result = () => {
    if (op !== "select") writes.push({ table, op, payload });
    const data = op === "select" ? tables[table] : op === "update" ? [{ id: "x" }] : { id: "new" };
    return { data, error: null };
  };
  const b: Record<string, unknown> = {};
  for (const m of ["select", "eq", "in", "limit", "order", "neq", "is"]) b[m] = () => b;
  b.insert = (p: unknown) => ((op = "insert"), (payload = p), b);
  b.update = (p: unknown) => ((op = "update"), (payload = p), b);
  b.maybeSingle = async () => result();
  b.single = async () => result();
  b.then = (res: (v: unknown) => unknown) => Promise.resolve(result()).then(res);
  return b;
}
const fakeDb = {
  from: (t: string) => (t === "tenant_members" ? { select: () => ({ eq: () => ({ in: async () => ({ data: [{ tenant_id: "t1", role }] }) }) }) } : builder(t)),
  auth: { getUser: async () => ({ data: { user: { id: "u1", email: "Boss@Example.com" } }, error: null }) },
  storage: { from: () => ({ createSignedUrl: async () => ({ data: { signedUrl: "https://signed" }, error: null }) }) },
};
vi.mock("@/lib/quote-store", () => ({ serviceClient: () => fakeDb }));
vi.mock("@/lib/mailer", () => ({ notificationMailConfig: () => null, sendEmail: vi.fn() }));

const { POST } = await import("./route");
const BRIEF = "3f1c2a4e-9b7d-4c2a-8e1f-0a1b2c3d4e5f";
const post = (body: Record<string, unknown>) =>
  POST(new NextRequest("http://localhost/api/admin/briefs", { method: "POST", headers: { authorization: "Bearer t" }, body: JSON.stringify({ briefId: BRIEF, ...body }) }));

beforeEach(() => {
  writes = [];
  role = "staff";
  tables = {
    website_briefs: { id: BRIEF, tenant_id: "t1", reference: "WNJO-ABC123", email: "c@example.com", name: "C", route: "proposal", stage: "approval", brief: { files: [{ path: "drafts/x/a.png", name: "a.png" }] } },
    build_approvals: [],
    website_proposals: [],
  };
});

describe("staff build actions", () => {
  it("lets staff record a quality decision, against their own verified email", async () => {
    const res = await post({ action: "approve", kind: "quality", decision: "approved" });
    expect(res.status).toBe(200);
    const row = writes.find((w) => w.table === "build_approvals")?.payload as Record<string, unknown>;
    expect(row).toMatchObject({ kind: "quality", decided_by: "u1", decided_by_email: "boss@example.com", decided_by_role: "staff" });
  });

  it("refuses pricing, contract and publication decisions from staff", async () => {
    for (const kind of ["pricing", "contract", "publication"]) {
      const res = await post({ action: "approve", kind, decision: "approved" });
      expect(res.status).toBe(403);
    }
    expect(writes).toEqual([]);
  });

  it("needs a reason to reject", async () => {
    role = "owner";
    expect((await post({ action: "approve", kind: "publication", decision: "rejected" })).status).toBe(422);
    expect((await post({ action: "approve", kind: "publication", decision: "rejected", note: "Typos on the home page" })).status).toBe(200);
  });

  it("won't mark a website live without all four approvals", async () => {
    role = "owner";
    tables.build_approvals = [{ kind: "quality", decision: "approved", created_at: "2026-11-09T10:00:00Z" }];
    tables.website_proposals = [{ id: "p" }];
    const res = await post({ action: "stage", stage: "live" });
    expect(res.status).toBe(409);
    expect((await res.json()).error).toMatch(/Pricing, Contract, Publication/);
    expect(writes).toEqual([]);
  });

  it("won't move a bespoke brief to payment before the proposal is accepted", async () => {
    tables.website_briefs = { ...(tables.website_briefs as object), stage: "proposal" };
    const res = await post({ action: "stage", stage: "awaiting_payment" });
    expect(res.status).toBe(409);
  });

  it("only links to files that are on the brief", async () => {
    expect((await post({ action: "file_link", path: "drafts/x/a.png" })).status).toBe(200);
    expect((await post({ action: "file_link", path: "drafts/other/secret.pdf" })).status).toBe(404);
  });

  it("lets only an owner or admin approve a proposal's price", async () => {
    tables.website_proposals = { id: "p1", reference: "WP-1", status: "pending_approval" };
    const id = "11111111-1111-4111-8111-111111111111";
    expect((await post({ action: "proposal", proposalId: id, op: "approve" })).status).toBe(403);
    role = "admin";
    expect((await post({ action: "proposal", proposalId: id, op: "approve" })).status).toBe(200);
    const pricing = writes.find((w) => w.table === "build_approvals")?.payload as Record<string, unknown>;
    expect(pricing).toMatchObject({ kind: "pricing", decision: "approved", proposal_id: "p1", decided_by_role: "admin" });
  });

  it("can't send a proposal that hasn't been approved", async () => {
    tables.website_proposals = { id: "p1", reference: "WP-1", status: "draft" };
    const res = await post({ action: "proposal", proposalId: "11111111-1111-4111-8111-111111111111", op: "send" });
    expect(res.status).toBe(403);
  });
});

describe("handing over a website bought outright", () => {
  const paid = () => {
    tables.website_briefs = { ...(tables.website_briefs as object), balance_paid_at: "2026-11-20T10:00:00Z", handed_over_at: null };
  };

  it("is for an owner or admin only", async () => {
    paid();
    expect((await post({ action: "handover" })).status).toBe(403);
    expect(writes).toEqual([]);
  });

  it("waits for the final payment", async () => {
    role = "owner";
    const res = await post({ action: "handover" });
    expect(res.status).toBe(409);
    expect((await res.json()).error).toMatch(/final payment/);
    expect(writes).toEqual([]);
  });

  it("hands over once, records it, and closes a website we don't host", async () => {
    role = "owner";
    paid();
    expect((await post({ action: "handover", note: "Your files are in the shared folder." })).status).toBe(200);
    const updates = writes.filter((w) => w.table === "website_briefs" && w.op === "update").map((w) => w.payload as Record<string, unknown>);
    expect(updates[0]).toHaveProperty("handed_over_at");
    expect(updates[1]).toEqual({ stage: "closed" });
    const events = writes.filter((w) => w.table === "website_brief_events").map((w) => w.payload as Record<string, unknown>);
    expect(events[0]).toMatchObject({ kind: "note", detail: { handover: "done", note: "Your files are in the shared folder." } });
  });

  it("can't be done twice", async () => {
    role = "owner";
    tables.website_briefs = { ...(tables.website_briefs as object), balance_paid_at: "2026-11-20T10:00:00Z", handed_over_at: "2026-11-21T10:00:00Z" };
    expect((await post({ action: "handover" })).status).toBe(409);
    expect(writes).toEqual([]);
  });
});

