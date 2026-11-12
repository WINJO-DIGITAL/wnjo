import { beforeEach, describe, expect, it } from "vitest";
import { EMPTY_BRIEF } from "@/lib/website-brief";
import type { Staff } from "@/lib/staff-auth";
import type { AiProvider } from "./provider";
import { pagesAllowedFor, releasePreview, runPlanStep, runPreviewStep, withdrawPreview } from "./website-ai-service";

type Write = { table: string; op: string; payload: unknown; eq: Record<string, unknown> };
let writes: Write[] = [];
let brief: Record<string, unknown>;
let previewRow: Record<string, unknown> | null;
let enquiry: unknown = null;
let latestPlan: unknown = null;

const plan = {
  summary: "A bakery site.",
  tone: "Warm",
  pages: [{ slug: "home", title: "Home", purpose: "Welcome", sections: [{ kind: "hero", heading: "Fresh bread", points: [] }] }],
  seo: { siteTitle: "H", description: "B" },
  assumptions: [],
  questions: [],
};

function builder(table: string) {
  let op = "select";
  let payload: unknown;
  const eq: Record<string, unknown> = {};
  const b: Record<string, unknown> = {};
  for (const m of ["select", "order", "limit", "in"]) b[m] = () => b;
  b.eq = (k: string, v: unknown) => ((eq[k] = v), b);
  b.insert = (p: unknown) => ((op = "insert"), (payload = p), b);
  b.update = (p: unknown) => ((op = "update"), (payload = p), b);
  b.maybeSingle = async () => {
    if (table === "website_briefs") return { data: brief, error: null };
    if (table === "enquiries") return { data: enquiry, error: null };
    if (table === "website_previews") return { data: previewRow, error: null };
    if (table === "website_plans") return { data: latestPlan, error: null };
    return { data: null, error: null };
  };
  b.single = async () => {
    writes.push({ table, op, payload, eq });
    return { data: { id: `${table}-1` }, error: null };
  };
  b.then = (res: (v: unknown) => unknown) => {
    if (op !== "select") writes.push({ table, op, payload, eq });
    return Promise.resolve({ data: op === "update" ? [{ id: "x" }] : [], error: null }).then(res);
  };
  return b;
}
const db = { from: builder } as never;
const staff: Staff = { userId: "u1", email: "staff@winjo.test", tenantId: "t1", role: "staff" };
const provider = (text: string): AiProvider => ({ name: "fake", model: "m", complete: async () => ({ kind: "final", text, usage: { inputTokens: 1, outputTokens: 1, costPence: 5 } }) });
const writesTo = (table: string) => writes.filter((w) => w.table === table);

beforeEach(() => {
  writes = [];
  enquiry = null;
  latestPlan = null;
  previewRow = null;
  brief = { id: "b1", tenant_id: "t1", reference: "WNJO-ABC123", email: "owner@cafe.co.uk", name: "Sam", business_name: "Harbour Bakery", stage: "specification", brief: EMPTY_BRIEF, figures: { package: "Core" } };
});

describe("the plan step", () => {
  it("saves a draft plan, records it, and moves a paid build on to website generation", async () => {
    const r = await runPlanStep(db, staff, provider(JSON.stringify(plan)), "b1");
    expect(r).toMatchObject({ ok: true, version: 1, costPence: 5 });
    expect(writesTo("website_plans")).toHaveLength(1);
    expect(writesTo("website_briefs")[0].payload).toEqual({ stage: "building" });
    expect(writesTo("website_brief_events").map((w) => (w.payload as { kind: string }).kind)).toEqual(["ai", "stage"]);
  });

  it("does nothing before the customer has paid", async () => {
    brief = { ...brief, stage: "proposal" };
    const r = await runPlanStep(db, staff, provider(JSON.stringify(plan)), "b1");
    expect(r).toMatchObject({ ok: false, status: 409 });
    expect(writes).toEqual([]);
  });

  it("keeps the build where it is when the reply can't be used", async () => {
    const r = await runPlanStep(db, staff, provider("not json"), "b1");
    expect(r).toMatchObject({ ok: false, status: 502 });
    expect(writesTo("website_briefs")).toEqual([]);
    expect(writesTo("website_plans")).toEqual([]);
  });

  it("is limited to the staff member's own agency", async () => {
    await runPlanStep(db, staff, provider(JSON.stringify(plan)), "b1");
    expect(writesTo("website_plans")[0].payload).toMatchObject({ tenant_id: "t1" });
  });
});

describe("the preview step", () => {
  it("asks for the plan first", async () => {
    expect(await runPreviewStep(db, staff, provider("{}"), "b1")).toMatchObject({ ok: false, status: 409, error: "Make the plan first." });
  });

  it("writes a draft preview that is not with the customer", async () => {
    latestPlan = { id: "plan1", version: 1, plan };
    const copy = JSON.stringify({ headline: "Fresh bread", intro: "Hi", sections: [{ heading: "A", body: "B", bullets: [] }], cta: "Call" });
    const r = await runPreviewStep(db, staff, provider(copy), "b1", "Shorter");
    expect(r).toMatchObject({ ok: true });
    const saved = writesTo("website_previews")[0].payload as { status?: string; change_note: string };
    expect(saved.status).toBeUndefined();
    expect(saved.change_note).toBe("Shorter");
    expect(writesTo("website_briefs")).toEqual([]);
  });
});

describe("releasing a preview", () => {
  it("is a person's decision: it releases the draft and moves the build to customer review", async () => {
    brief = { ...brief, stage: "building" };
    previewRow = { id: "p1", brief_id: "b1", status: "draft" };
    const r = await releasePreview(db, staff, "p1");
    expect(r).toMatchObject({ ok: true, stage: "preview", email: "owner@cafe.co.uk" });
    const updates = writesTo("website_previews").map((w) => w.payload as { status: string; released_by?: string });
    expect(updates.map((u) => u.status)).toEqual(["withdrawn", "released"]);
    expect(updates[1].released_by).toBe("u1");
    expect(writesTo("website_briefs")[0].payload).toEqual({ stage: "preview" });
  });

  it("won't release one that is already with the customer", async () => {
    previewRow = { id: "p1", brief_id: "b1", status: "released" };
    expect(await releasePreview(db, staff, "p1")).toMatchObject({ ok: false, status: 409 });
  });

  it("withdraws only a released preview", async () => {
    previewRow = { id: "p1", brief_id: "b1", status: "draft" };
    expect(await withdrawPreview(db, staff, "p1")).toMatchObject({ ok: false, status: 409 });
    previewRow = { id: "p1", brief_id: "b1", status: "released" };
    expect(await withdrawPreview(db, staff, "p1")).toMatchObject({ ok: true });
  });
});

describe("pages allowed", () => {
  it("falls back to the package's own allowance", async () => {
    expect(await pagesAllowedFor(db, brief as never)).toBe(5);
  });

  it("puts no package limit on a buy-outright brief, which staff quote from what the customer asks for", async () => {
    expect(await pagesAllowedFor(db, { ...brief, route: "proposal" } as never)).toBe(100);
  });
});
