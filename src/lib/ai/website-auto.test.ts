import { beforeEach, describe, expect, it, vi } from "vitest";

const steps: string[] = [];
const alerts: string[] = [];
const state: { planned: string[]; planFails: boolean; buildOk: boolean; checksOk: boolean; failedEvents: number; startedFirst: string | null } = { planned: [], planFails: false, buildOk: true, checksOk: true, failedEvents: 0, startedFirst: null };

vi.mock("server-only", () => ({}));
vi.mock("./website-ai-service", () => ({
  runPlanStep: async (_d: unknown, actor: { kind: string }, _p: unknown, id: string) => {
    steps.push(`plan:${actor.kind}`);
    if (state.planFails) return { ok: false, status: 502, error: "plan down" };
    state.planned.push(id);
    return { ok: true, version: 1, costPence: 1 };
  },
  runPreviewStep: async () => (steps.push("preview"), { ok: true, version: 1, costPence: 1 }),
  logEvent: async (_d: unknown, _a: unknown, _id: string, _k: string, detail: { step: string }) => void steps.push(`event:${detail.step}`),
}));
vi.mock("./website-ai-store", () => ({
  SupabaseWebsiteAiStore: class {
    async latestPlan(id: string) {
      return state.planned.includes(id) ? { id: "p", version: 1, plan: { summary: "s", tone: "t", pages: [{ slug: "home", title: "Home", purpose: "", sections: [] }], seo: { siteTitle: "", description: "" }, assumptions: [], questions: [] } } : null;
    }
  },
}));
vi.mock("@/lib/site-template/build-service", () => ({
  runSiteBuildStep: async (_d: unknown, actor: { kind: string }, _p: unknown, _id: string, input: { sector?: string; answers?: { look?: string } }) => {
    steps.push(`site:${actor.kind}:${input.sector}:${input.answers?.look}`);
    return state.buildOk ? { ok: true, version: 1, checksOk: state.checksOk, issues: state.checksOk ? 0 : 2, costPence: 1 } : { ok: false, status: 502, error: "build down" };
  },
}));
vi.mock("./owner-alerts", async (original) => ({
  ...(await original<typeof import("./owner-alerts")>()),
  alertOwner: async (_w: unknown, m: { subject: string }) => void alerts.push(m.subject),
}));

import { MAX_FAILED_TRIES, regenerateWebsite, runAutoDrafts } from "./website-auto";

const withGoals = { goals: ["enquiries"] };
const week = (["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const).map((day) => (day === "Sun" ? { day, closed: true } : { day, open: "09:00", close: "18:00" }));
const siteAnswers = { sector: "barber", answers: { businessName: "Hartley & Sons", servicesText: "Cut £20", about: "A family barber shop.", hours: week, email: "book@hartley.example", phone: "01632 960123" } };
const ownWords = { goals: ["enquiries"], otherBusinessType: "mobile dog groomer", profile: { services: "Full groom £40\nNail trim £8", phone: "", email: "paws@example.co.uk", differentiator: "We come to you.", customers: "", areas: "Preston", firstActions: [], hours: "", proof: "", about: "", tone: "" } };
type B = { id: string; tenant_id: string; reference?: string; email?: string; name?: string; business_name?: string; brief?: unknown };
const full = (b: B) => ({ reference: "WNJO-1", email: "c@x.co.uk", name: "Sam", business_name: "Biz", ...b });

const fakeDb = (briefs: B[], withSite: string[] = []) =>
  ({
    from: (table: string) => {
      let id = "";
      const b: Record<string, unknown> = {};
      for (const m of ["select", "order", "limit", "gte", "in"]) b[m] = () => b;
      b.eq = (k: string, v: string) => (k === "brief_id" && (id = v), b);
      b.maybeSingle = async () => ({ data: table === "website_site_builds" && withSite.includes(id) ? { id: "x" } : null });
      b.then = (res: (v: unknown) => unknown) => {
        let data: unknown[] = [];
        if (table === "website_briefs") data = briefs.map(full);
        if (table === "website_brief_events") {
          data = Array.from({ length: state.failedEvents }, () => ({ detail: { ok: false, step: "plan" } }));
          if (state.startedFirst) data.unshift({ detail: { step: "started", token: state.startedFirst } });
        }
        return Promise.resolve({ data }).then(res);
      };
      return b;
    },
  }) as never;

const provider = (sector = "barber", look = "bold") => ({ name: "x", model: "m", complete: async () => ({ kind: "final" as const, text: JSON.stringify({ sector, look }), usage: { inputTokens: 0, outputTokens: 0, costPence: 1 } }) });

beforeEach(() => {
  steps.length = 0;
  alerts.length = 0;
  Object.assign(state, { planned: [], planFails: false, buildOk: true, checksOk: true, failedEvents: 0, startedFirst: null });
});

describe("automatic first drafts", () => {
  it("does nothing without an AI key", async () => {
    expect(await runAutoDrafts(fakeDb([{ id: "b1", tenant_id: "t", brief: withGoals }]), null)).toEqual({ attempted: 0, drafted: 0 });
    expect(steps).toEqual([]);
  });

  it("waits for a website paid for through the short checkout until its goals are in", async () => {
    expect(await runAutoDrafts(fakeDb([{ id: "b1", tenant_id: "t", brief: { goals: [] } }]), provider())).toEqual({ attempted: 0, drafted: 0 });
    expect(steps).toEqual([]);
  });

  it("plans first, then builds the template the customer chose, with the AI choosing the look, and tells the owner", async () => {
    const r = await runAutoDrafts(fakeDb([{ id: "b1", tenant_id: "t", brief: { goals: [], site: siteAnswers } }]), provider("barber", "classic"));
    expect(r).toEqual({ attempted: 1, drafted: 1 });
    expect(steps.filter((s) => !s.startsWith("event:started"))).toEqual(["plan:system", "event:template", "site:system:barber:classic"]);
    expect(alerts).toEqual(["Ready for your review: Biz [WNJO-1]"]);
  });

  it("never overrules the sector a customer ticked, even if the model names another", async () => {
    await runAutoDrafts(fakeDb([{ id: "b1", tenant_id: "t", brief: { goals: [], site: siteAnswers } }]), provider("plumber", "classic"));
    expect(steps.some((s) => s.startsWith("site:system:barber:"))).toBe(true);
  });

  it("keeps a look the customer chose, with no model call to choose it", async () => {
    const chosen = { ...siteAnswers, answers: { ...siteAnswers.answers, look: "minimal" } };
    await runAutoDrafts(fakeDb([{ id: "b1", tenant_id: "t", brief: { goals: [], site: chosen } }]), provider("barber", "bold"));
    expect(steps).toContain("site:system:barber:minimal");
  });

  it("chooses the template itself for a customer who described their own kind of business", async () => {
    const r = await runAutoDrafts(fakeDb([{ id: "b1", tenant_id: "t", brief: ownWords }]), provider("cleaning", "warm"));
    expect(r.drafted).toBe(1);
    expect(steps).toContain("site:system:cleaning:warm");
  });

  it("falls back to a text draft when no template can be built from what they told us", async () => {
    const noFit = { ...ownWords, profile: { ...ownWords.profile, services: "", email: "" } };
    const r = await runAutoDrafts(fakeDb([{ id: "b1", tenant_id: "t", brief: noFit }]), provider());
    expect(r.drafted).toBe(1);
    expect(steps.filter((s) => !s.startsWith("event:"))).toEqual(["plan:system", "preview"]);
    expect(alerts).toHaveLength(1);
  });

  it("says when a build needs a look, rather than ready", async () => {
    state.checksOk = false;
    await runAutoDrafts(fakeDb([{ id: "b1", tenant_id: "t", brief: { goals: [], site: siteAnswers } }]), provider());
    expect(alerts).toEqual(["Needs your look: Biz [WNJO-1]"]);
  });

  it("leaves a template brief alone until its answers are complete, and once it has a build", async () => {
    const half = { sector: "barber", answers: { businessName: "Hartley & Sons" } };
    const briefs = [
      { id: "b1", tenant_id: "t", brief: { goals: [], site: half } },
      { id: "b2", tenant_id: "t", brief: { goals: [], site: siteAnswers } },
    ];
    expect(await runAutoDrafts(fakeDb(briefs, ["b2"]), provider())).toEqual({ attempted: 1, drafted: 0 });
    expect(steps.filter((s) => s.startsWith("plan") || s.startsWith("site"))).toEqual([]);
  });

  it("stops at the limit", async () => {
    const briefs = ["b1", "b2", "b3", "b4"].map((id) => ({ id, tenant_id: "t", brief: ownWords }));
    const r = await runAutoDrafts(fakeDb(briefs), provider("cleaning", "warm"), 2);
    expect(r.attempted).toBe(2);
  });

  it("keeps quiet on the first failure and tells the owner on the last", async () => {
    state.planFails = true;
    state.failedEvents = 1;
    expect((await runAutoDrafts(fakeDb([{ id: "b1", tenant_id: "t", brief: ownWords }]), provider())).drafted).toBe(0);
    expect(alerts).toEqual([]);
    state.failedEvents = MAX_FAILED_TRIES;
    // At the limit a website is no longer picked up: the owner has already been told.
    expect(await runAutoDrafts(fakeDb([{ id: "b1", tenant_id: "t", brief: ownWords }]), provider())).toEqual({ attempted: 0, drafted: 0 });
  });

  it("leaves a website alone when another run got there first", async () => {
    state.startedFirst = "someone-else";
    expect(await runAutoDrafts(fakeDb([{ id: "b1", tenant_id: "t", brief: ownWords }]), provider())).toEqual({ attempted: 0, drafted: 0 });
    expect(steps.some((s) => s.startsWith("plan"))).toBe(false);
  });

  it("makes a text draft instead of forcing a poor fit when the AI says no template suits the business", async () => {
    const r = await runAutoDrafts(fakeDb([{ id: "b1", tenant_id: "t", brief: ownWords }]), provider("none", "warm"));
    expect(r.drafted).toBe(1);
    expect(steps.filter((s) => !s.startsWith("event:"))).toEqual(["plan:system", "preview"]);
  });
});

describe("regenerating a website", () => {
  const staff = { userId: "u1", email: "o@w.co.uk", tenantId: "t", kind: "staff" as const };
  const withBrief = (brief: unknown, hasPlan = true) => {
    state.planned = hasPlan ? ["b1"] : [];
    return fakeDb([{ id: "b1", tenant_id: "t", brief }], ["b1"]);
  };
  const single = (brief: unknown) => {
    const db = withBrief(brief) as unknown as { from: (t: string) => Record<string, unknown> };
    const from = db.from;
    db.from = (t: string) => {
      const b = from(t);
      if (t === "website_briefs") b.maybeSingle = async () => ({ data: full({ id: "b1", tenant_id: "t", brief }) });
      return b;
    };
    return db as never;
  };

  it("starts again from a new plan even when a plan, a preview and a build already exist, and sends no email", async () => {
    const r = await regenerateWebsite(single(ownWords), provider("cleaning", "bold"), staff, "b1");
    expect(r).toEqual({ ok: true, outcome: "drafted" });
    expect(steps.filter((s) => !s.startsWith("event:"))).toEqual(["plan:staff", "site:staff:cleaning:bold"]);
    expect(alerts).toEqual([]);
  });

  it("refuses a website whose customer hasn't sent their goals", async () => {
    expect(await regenerateWebsite(single({ goals: [] }), provider(), staff, "b1")).toMatchObject({ ok: false, status: 409 });
  });
});
