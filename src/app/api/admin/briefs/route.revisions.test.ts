import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/** Stand-in for the database: the lookup and the "what is still open" list answer separately, and writes are kept. */
type Write = { table: string; op: "insert" | "update"; payload: unknown };
let writes: Write[] = [];
let role: "owner" | "admin" | "staff" = "staff";
let brief: Record<string, unknown> = {};
let revision: Record<string, unknown> | null = null;
let stillOpen: { id: string }[] = [];
let updateRows: { id: string }[] = [{ id: "r1" }];
const emails: { to: string; subject: string; text: string }[] = [];

function builder(table: string) {
  let op: "select" | "insert" | "update" = "select";
  let payload: unknown;
  const b: Record<string, unknown> = {};
  for (const m of ["select", "eq", "in", "limit", "order"]) b[m] = () => b;
  b.insert = (p: unknown) => ((op = "insert"), (payload = p), b);
  b.update = (p: unknown) => ((op = "update"), (payload = p), b);
  b.maybeSingle = async () => ({ data: table === "build_revisions" ? revision : brief, error: null });
  b.then = (res: (v: unknown) => unknown) => {
    if (op !== "select") writes.push({ table, op, payload });
    let data: unknown = [];
    if (op === "update") data = table === "build_revisions" ? updateRows : [{ id: "x" }];
    if (op === "select" && table === "build_revisions") data = stillOpen;
    return Promise.resolve({ data, error: null }).then(res);
  };
  return b;
}
const fakeDb = {
  from: (t: string) => (t === "tenant_members" ? { select: () => ({ eq: () => ({ in: async () => ({ data: [{ tenant_id: "t1", role }] }) }) }) } : builder(t)),
  auth: { getUser: async () => ({ data: { user: { id: "u1", email: "Boss@Example.com" } }, error: null }) },
};
vi.mock("@/lib/quote-store", () => ({ serviceClient: () => fakeDb }));
vi.mock("@/lib/mailer", () => ({
  notificationMailConfig: () => ({}),
  sendEmail: async (_c: unknown, m: { to: string; subject: string; text: string }) => {
    emails.push(m);
    return true;
  },
}));

const { POST } = await import("./route");
const BRIEF = "3f1c2a4e-9b7d-4c2a-8e1f-0a1b2c3d4e5f";
const REV = "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d";
const post = (body: Record<string, unknown>) =>
  POST(new NextRequest("http://localhost/api/admin/briefs", { method: "POST", headers: { authorization: "Bearer t" }, body: JSON.stringify({ briefId: BRIEF, action: "revision", revisionId: REV, ...body }) }));
const writesTo = (table: string) => writes.filter((w) => w.table === table);

beforeEach(() => {
  writes = [];
  emails.length = 0;
  role = "staff";
  stillOpen = [];
  updateRows = [{ id: REV }];
  brief = { id: BRIEF, tenant_id: "t1", reference: "WNJO-ABC123", email: "c@example.com", name: "Sam Cafe", route: "package", stage: "changes", brief: {} };
  revision = { id: REV, number: 2, status: "open" };
});

describe("staff answer a change request", () => {
  it("lets any member of staff start a waiting change, logged against them", async () => {
    const res = await post({ op: "start" });
    expect(res.status).toBe(200);
    expect(writesTo("build_revisions")[0].payload).toEqual({ status: "in_progress" });
    expect(writesTo("website_brief_events")[0].payload).toMatchObject({ kind: "revision", actor_user: "u1", actor_email: "boss@example.com", detail: { action: "started", number: 2 } });
    expect(writesTo("website_briefs")).toEqual([]);
  });

  it("finishing the last open change returns the build to the customer's review and emails them", async () => {
    const res = await post({ op: "done", note: "Logo is now larger." });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, stage: "preview" });
    expect(writesTo("build_revisions")[0].payload).toMatchObject({ status: "done", response: "Logo is now larger.", resolved_by: "u1" });
    expect(writesTo("website_briefs")[0].payload).toEqual({ stage: "preview" });
    expect(emails).toHaveLength(1);
    expect(emails[0]).toMatchObject({ to: "c@example.com", subject: "Your changes are ready to review [WNJO-ABC123]" });
  });

  it("stays in changes, and sends no email, while other changes are still open", async () => {
    stillOpen = [{ id: "r3" }];
    const res = await post({ op: "done" });
    expect(await res.json()).toMatchObject({ ok: true, stage: "changes" });
    expect(writesTo("website_briefs")).toEqual([]);
    expect(emails).toEqual([]);
  });

  it("a decline must give a reason, and then goes back to review the same way", async () => {
    expect((await post({ op: "decline" })).status).toBe(422);
    expect(writes).toEqual([]);
    const res = await post({ op: "decline", note: "That's outside this package." });
    expect(res.status).toBe(200);
    expect(writesTo("build_revisions")[0].payload).toMatchObject({ status: "declined", response: "That's outside this package." });
  });

  it("never reopens or re-answers a finished change", async () => {
    revision = { id: REV, number: 2, status: "done" };
    for (const op of ["start", "done", "decline"]) {
      expect((await post({ op, note: "x" })).status).toBe(409);
    }
    expect(writes).toEqual([]);
  });

  it("reports a change that was answered in the meantime", async () => {
    updateRows = [];
    expect((await post({ op: "done" })).status).toBe(409);
    expect(writesTo("website_brief_events")).toEqual([]);
  });

  it("treats an unknown change, a bad id and a bad action as errors", async () => {
    revision = null;
    expect((await post({ op: "done" })).status).toBe(404);
    expect((await post({ op: "explode" })).status).toBe(422);
    expect((await post({ op: "done", revisionId: "nope" })).status).toBe(422);
  });
});
