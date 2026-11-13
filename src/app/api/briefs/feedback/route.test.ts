import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/** A small stand-in for the database: tables answer from state, and every write is recorded. */
const BRIEF_ID = "3f1c2a4e-9b7d-4c2a-8e1f-0a1b2c3d4e5f";
type Write = { table: string; op: "insert" | "update"; payload: unknown };
let writes: Write[] = [];
let user: Record<string, unknown> | null = null;
let brief: Record<string, unknown> | null = null;
let unfinished: { id: string; status: string }[] = [];
let insertError: { code: string } | null = null;
let limited = false;
const sent: { subject: string; text: string }[] = [];

function builder(table: string) {
  let op: "select" | "insert" | "update" = "select";
  let payload: unknown;
  const b: Record<string, unknown> = {};
  for (const m of ["select", "eq", "in"]) b[m] = () => b;
  b.insert = (p: unknown) => ((op = "insert"), (payload = p), b);
  b.update = (p: unknown) => ((op = "update"), (payload = p), b);
  b.maybeSingle = async () => ({ data: brief, error: null });
  b.single = async () => {
    writes.push({ table, op: "insert", payload });
    return insertError ? { data: null, error: insertError } : { data: { number: 3 }, error: null };
  };
  b.then = (res: (v: unknown) => unknown) => {
    if (op !== "select") writes.push({ table, op, payload });
    const data = table === "build_revisions" && op === "select" ? unfinished : [{ id: "x" }];
    return Promise.resolve({ data, error: null }).then(res);
  };
  return b;
}
const fakeDb = { from: builder, auth: { getUser: async () => ({ data: { user }, error: null }) } };
vi.mock("@/lib/quote-store", () => ({ serviceClient: () => fakeDb }));
vi.mock("@/lib/rate-limit-shared", () => ({
  LIMITS_PER_ROUTE: { briefFeedback: { max: 20, windowSeconds: 600 } },
  sharedRateLimited: async () => limited,
}));
vi.mock("@/lib/mailer", () => ({
  mailConfig: () => ({}),
  sendEnquiryEmail: async (_c: unknown, m: { subject: string; text: string }) => {
    sent.push(m);
    return true;
  },
}));
const { POST } = await import("./route");

const post = (body: Record<string, unknown>) =>
  POST(new NextRequest("http://localhost/api/briefs/feedback", { method: "POST", headers: { authorization: "Bearer t" }, body: JSON.stringify({ briefId: BRIEF_ID, ...body }) }));
const writesTo = (table: string) => writes.filter((w) => w.table === table);

beforeEach(() => {
  writes = [];
  sent.length = 0;
  limited = false;
  insertError = null;
  unfinished = [];
  user = { id: "c1", email: "Owner@Cafe.co.uk", email_confirmed_at: "2026-11-01" };
  brief = { id: BRIEF_ID, tenant_id: "t1", reference: "WNJO-ABC123", email: "owner@cafe.co.uk", name: "Sam", stage: "preview" };
});

describe("customer asks for changes", () => {
  it("saves a numbered request, moves the build to changes requested, logs it and tells the team", async () => {
    const res = await post({ action: "request_changes", text: "Please make the logo bigger." });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, number: 3 });
    expect(writesTo("build_revisions")[0].payload).toMatchObject({ brief_id: BRIEF_ID, request: "Please make the logo bigger.", requested_by_email: "owner@cafe.co.uk" });
    expect(writesTo("website_briefs")[0].payload).toEqual({ stage: "changes" });
    const events = writesTo("website_brief_events")[0].payload as { kind: string; actor_type: string }[];
    expect(events.map((e) => e.kind)).toEqual(["revision", "stage"]);
    expect(events.every((e) => e.actor_type === "customer")).toBe(true);
    expect(sent[0].subject).toBe("Changes requested [WNJO-ABC123]");
    expect(sent[0].text).toContain("Please make the logo bigger.");
  });

  it("can add more while the build is already in changes, without moving the stage", async () => {
    brief = { ...brief!, stage: "changes" };
    unfinished = [{ id: "r1", status: "open" }];
    expect((await post({ action: "request_changes", text: "And change the heading." })).status).toBe(200);
    expect(writesTo("website_briefs")).toEqual([]);
  });

  it("refuses before the preview is ready and after it has moved on", async () => {
    for (const stage of ["building", "approval", "live"]) {
      brief = { ...brief!, stage };
      expect((await post({ action: "request_changes", text: "Please make the logo bigger." })).status).toBe(409);
    }
    expect(writesTo("build_revisions")).toEqual([]);
  });

  it("refuses an empty or over-long request", async () => {
    expect((await post({ action: "request_changes", text: "  " })).status).toBe(422);
    expect((await post({ action: "request_changes", text: "x".repeat(2001) })).status).toBe(422);
    expect(writesTo("build_revisions")).toEqual([]);
  });

  it("stops after the included rounds of changes, even when they are finished", async () => {
    brief = { ...brief!, stage: "changes" };
    unfinished = [
      { id: "r1", status: "done" },
      { id: "r2", status: "done" },
    ];
    expect((await post({ action: "request_changes", text: "A third round, please." })).status).toBe(409);
    expect(writesTo("build_revisions")).toEqual([]);
  });

  it("stops a pile-up of unanswered requests", async () => {
    brief = { ...brief!, stage: "changes" };
    unfinished = Array.from({ length: 5 }, (_, i) => ({ id: `r${i}`, status: "open" }));
    expect((await post({ action: "request_changes", text: "One more thing please." })).status).toBe(409);
  });

  it("reports a failed save without moving the build or emailing", async () => {
    insertError = { code: "XX000" };
    const res = await post({ action: "request_changes", text: "Please make the logo bigger." });
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("XX000");
    expect(writesTo("website_briefs")).toEqual([]);
    expect(sent).toEqual([]);
  });
});

describe("customer approves the preview", () => {
  it("sends the build on for WINJO's approvals, and approves nothing itself", async () => {
    const res = await post({ action: "approve_preview" });
    expect(res.status).toBe(200);
    expect(writesTo("website_briefs")[0].payload).toEqual({ stage: "approval" });
    expect(writesTo("build_approvals")).toEqual([]);
    const events = writesTo("website_brief_events")[0].payload as { kind: string }[];
    expect(events.map((e) => e.kind)).toEqual(["preview", "stage"]);
    expect(sent[0].subject).toBe("Preview approved by the customer [WNJO-ABC123]");
  });

  it("is refused while changes are outstanding, and outside the preview stage", async () => {
    unfinished = [{ id: "r1", status: "open" }];
    expect((await post({ action: "approve_preview" })).status).toBe(409);
    unfinished = [];
    for (const stage of ["changes", "building", "approval", "live"]) {
      brief = { ...brief!, stage };
      expect((await post({ action: "approve_preview" })).status).toBe(409);
    }
    expect(writes).toEqual([]);
  });
});

describe("who can do it", () => {
  it("treats someone else's build as missing", async () => {
    user = { id: "c2", email: "other@example.com", email_confirmed_at: "2026-11-01" };
    expect((await post({ action: "request_changes", text: "Please make the logo bigger." })).status).toBe(404);
    expect((await post({ action: "approve_preview" })).status).toBe(404);
    expect(writes).toEqual([]);
  });

  it("needs a signed-in customer with a confirmed email", async () => {
    user = { id: "c1", email: "owner@cafe.co.uk", email_confirmed_at: null };
    expect((await post({ action: "approve_preview" })).status).toBe(401);
    user = null;
    expect((await post({ action: "approve_preview" })).status).toBe(401);
  });

  it("rejects a malformed request and a limited connection", async () => {
    expect((await post({ action: "delete_everything" })).status).toBe(422);
    expect((await post({ briefId: "nope", action: "approve_preview" })).status).toBe(422);
    limited = true;
    expect((await post({ action: "approve_preview" })).status).toBe(429);
    expect(writes).toEqual([]);
  });
});
