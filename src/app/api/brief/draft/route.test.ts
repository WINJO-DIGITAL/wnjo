import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET, PUT } from "./route";
import { sharedRateLimited } from "@/lib/rate-limit-shared";
import { EMPTY_BRIEF } from "@/lib/website-brief";
import { EMPTY_DETAILS } from "@/lib/website-enquiry";
import { DEFAULT_WEBSITE_ANSWERS } from "@/lib/website-quote";

const state = vi.hoisted(() => ({
  on: true,
  failWrite: false,
  rows: new Map<string, { draft_id: string; tenant_id: string; payload: unknown; expires_at: string }>(),
  purges: 0,
}));

vi.mock("@/lib/enquiry-store", () => ({ WNJO_TENANT_ID: "00000000-0000-4000-8000-000000000001" }));
vi.mock("@/lib/rate-limit-shared", () => ({
  LIMITS_PER_ROUTE: { briefDraft: { max: 120, windowSeconds: 600 } },
  sharedRateLimited: vi.fn(async () => false),
}));
vi.mock("@/lib/quote-store", () => ({
  serviceClient: () =>
    state.on
      ? {
          from: () => ({
            upsert: async (row: { draft_id: string; tenant_id: string; payload: unknown; expires_at: string }) => {
              if (state.failWrite) return { error: { code: "XX000" } };
              state.rows.set(row.draft_id, row);
              return { error: null };
            },
            select: () => ({ eq: (_c: string, id: string) => ({ maybeSingle: async () => ({ data: state.rows.get(id) ?? null }) }) }),
            delete: () => ({
              lt: async () => {
                state.purges++;
                return { error: null };
              },
            }),
          }),
        }
      : null,
}));

const ID = "3f1c2a4e-9b7d-4c2a-8e1f-0a1b2c3d4e5f";
const draft = (over: Record<string, unknown> = {}) => ({
  answers: DEFAULT_WEBSITE_ANSWERS,
  details: { ...EMPTY_DETAILS, email: "ada@example.com" },
  brief: { ...EMPTY_BRIEF, colours: "navy" },
  step: 2,
  ...over,
});
const put = (body: unknown, headers: Record<string, string> = {}) =>
  PUT(new NextRequest("http://localhost/api/brief/draft", { method: "PUT", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) }));
const get = (id: string) => GET(new NextRequest(`http://localhost/api/brief/draft?id=${encodeURIComponent(id)}`));

beforeEach(() => {
  state.on = true;
  state.failWrite = false;
  state.rows.clear();
  state.purges = 0;
  vi.spyOn(Math, "random").mockReturnValue(0.5);
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe("PUT /api/brief/draft", () => {
  it("saves a valid draft for 30 days and never stores anything the cleaner drops", async () => {
    const res = await put({ draftId: ID, draft: draft({ details: { ...EMPTY_DETAILS, email: "ada@example.com", isAdmin: true }, step: 500 }) });
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const row = state.rows.get(ID)!;
    expect(row.tenant_id).toBe("00000000-0000-4000-8000-000000000001");
    const payload = row.payload as { details: Record<string, unknown>; step: number };
    expect(payload.details).not.toHaveProperty("isAdmin");
    expect(payload.step).toBe(20);
    const days = (new Date(row.expires_at).getTime() - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(29.9);
    expect(days).toBeLessThan(30.1);
  });

  it("answers 503 when storage isn't connected", async () => {
    state.on = false;
    expect((await put({ draftId: ID, draft: draft() })).status).toBe(503);
  });

  it("refuses a bad draft id and unusable answers", async () => {
    expect((await put({ draftId: "nope", draft: draft() })).status).toBe(422);
    expect((await put({ draftId: ID, draft: draft({ answers: { plan: "platinum" } }) })).status).toBe(422);
    expect((await put({ draftId: ID })).status).toBe(422);
    expect(state.rows.size).toBe(0);
  });

  it("refuses an oversized draft", async () => {
    const res = await put({ draftId: ID, draft: draft({ details: { ...EMPTY_DETAILS, description: "x".repeat(70_000) } }) });
    expect(res.status).toBe(413);
    expect(state.rows.size).toBe(0);
  });

  it("refuses a declared body that is far too big without reading it", async () => {
    const res = await put({ draftId: ID, draft: draft() }, { "content-length": "999999" });
    expect(res.status).toBe(413);
  });

  it("limits requests per connection", async () => {
    vi.mocked(sharedRateLimited).mockResolvedValueOnce(true);
    expect((await put({ draftId: ID, draft: draft() })).status).toBe(429);
    expect(state.rows.size).toBe(0);
  });

  it("reports a storage failure without leaking the reason", async () => {
    state.failWrite = true;
    const res = await put({ draftId: ID, draft: draft() });
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("XX000");
  });

  it("sometimes clears out expired drafts", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.01);
    await put({ draftId: ID, draft: draft() });
    expect(state.purges).toBe(1);
  });
});

describe("GET /api/brief/draft", () => {
  it("returns a saved draft, uncached", async () => {
    await put({ draftId: ID, draft: draft() });
    const res = await get(ID);
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const json = (await res.json()) as { draft: { step: number; details: { email: string }; brief: { colours: string } } };
    expect(json.draft.step).toBe(2);
    expect(json.draft.details.email).toBe("ada@example.com");
    expect(json.draft.brief.colours).toBe("navy");
  });

  it("treats unknown, invalid and expired drafts alike", async () => {
    expect((await get(ID)).status).toBe(404);
    expect((await get("../../x")).status).toBe(404);
    state.rows.set(ID, { draft_id: ID, tenant_id: "t", payload: draft(), expires_at: new Date(Date.now() - 1000).toISOString() });
    expect((await get(ID)).status).toBe(404);
  });

  it("does not return a damaged stored draft", async () => {
    state.rows.set(ID, { draft_id: ID, tenant_id: "t", payload: { answers: "broken" }, expires_at: new Date(Date.now() + 100_000).toISOString() });
    expect((await get(ID)).status).toBe(404);
  });

  it("answers 503 when storage isn't connected and 429 when limited", async () => {
    state.on = false;
    expect((await get(ID)).status).toBe(503);
    state.on = true;
    vi.mocked(sharedRateLimited).mockResolvedValueOnce(true);
    expect((await get(ID)).status).toBe(429);
  });
});
