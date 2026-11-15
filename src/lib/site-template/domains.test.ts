import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { attachSiteDomain, listSiteDomains, MAX_DOMAINS_PER_SITE, removeSiteDomain } from "./domains";

type State = { brief: unknown; domains: { hostname: string; brief_id: string; tenant_id?: string; created_at?: string }[]; events: Record<string, unknown>[] };

function fakeDb(state: State) {
  return {
    from(table: string) {
      if (table === "website_briefs") {
        const b: Record<string, unknown> = {};
        for (const m of ["select", "eq"]) b[m] = () => b;
        b.maybeSingle = async () => ({ data: state.brief, error: null });
        return b;
      }
      if (table === "website_brief_events") return { insert: async (row: Record<string, unknown>) => (state.events.push(row), { error: null }) };
      // site_domains: a small query builder over the list
      const filters: Record<string, string> = {};
      let op: "select" | "delete" = "select";
      let head = false;
      const rows = () => state.domains.filter((d) => Object.entries(filters).every(([k, v]) => (d as Record<string, unknown>)[k] === v));
      const b: Record<string, unknown> = {
        select: (_cols: string, opts?: { head?: boolean }) => ((op = "select"), (head = Boolean(opts?.head)), b),
        delete: () => ((op = "delete"), b),
        eq: (k: string, v: string) => ((filters[k] = v), b),
        order: () => b,
        maybeSingle: async () => ({ data: rows()[0] ?? null, error: null }),
        insert: async (row: { hostname: string; brief_id: string }) => (state.domains.push(row), { error: null }),
        then: (resolve: (v: unknown) => void) => {
          if (op === "delete") {
            const gone = new Set(rows());
            state.domains = state.domains.filter((d) => !gone.has(d));
            return resolve({ error: null });
          }
          return resolve(head ? { count: rows().length, error: null } : { data: rows(), error: null });
        },
      };
      return b;
    },
  } as unknown as SupabaseClient;
}

const brief = { id: "b1", tenant_id: "t1", reference: "WNJO-1", email: "o@x.co.uk", name: "Pat", business_name: "Hartley", stage: "live", brief: {}, figures: {} };
const owner = { userId: "u1", email: "me@winjo.test", tenantId: "t1", role: "owner" };
const fresh = (): State => ({ brief, domains: [], events: [] });

describe("attachSiteDomain", () => {
  it("tidies the address, saves it for the website and records it in the history", async () => {
    const s = fresh();
    const r = await attachSiteDomain(fakeDb(s), owner, "b1", "https://Www.Hartley.co.uk/");
    expect(r).toEqual({ ok: true, hostname: "www.hartley.co.uk" });
    expect(s.domains).toEqual([expect.objectContaining({ hostname: "www.hartley.co.uk", brief_id: "b1", tenant_id: "t1", created_by: "u1" })]);
    expect(s.events[0]).toMatchObject({ kind: "note", brief_id: "b1" });
  });
  it("is for the owner or an admin only, because it changes what the public sees", async () => {
    const s = fresh();
    const r = await attachSiteDomain(fakeDb(s), { ...owner, role: "staff" }, "b1", "hartley.co.uk");
    expect(r).toMatchObject({ ok: false, status: 403 });
    expect(s.domains).toEqual([]);
  });
  it("refuses an address that isn't a plain domain, and our own addresses", async () => {
    for (const bad of ["", "hartley", "winjodigital.co.uk", "x.vercel.app", "not a domain"]) {
      expect(await attachSiteDomain(fakeDb(fresh()), owner, "b1", bad), bad).toMatchObject({ ok: false, status: 422 });
    }
  });
  it("refuses an address another website already uses, and accepts the same website again", async () => {
    const s = fresh();
    s.domains.push({ hostname: "hartley.co.uk", brief_id: "other", tenant_id: "t1" });
    expect(await attachSiteDomain(fakeDb(s), owner, "b1", "hartley.co.uk")).toMatchObject({ ok: false, status: 409 });
    s.domains = [{ hostname: "hartley.co.uk", brief_id: "b1", tenant_id: "t1" }];
    expect(await attachSiteDomain(fakeDb(s), owner, "b1", "hartley.co.uk")).toEqual({ ok: true, hostname: "hartley.co.uk" });
    expect(s.domains).toHaveLength(1);
  });
  it("limits how many addresses one website can have", async () => {
    const s = fresh();
    for (let i = 0; i < MAX_DOMAINS_PER_SITE; i++) s.domains.push({ hostname: `site${i}.co.uk`, brief_id: "b1", tenant_id: "t1" });
    expect(await attachSiteDomain(fakeDb(s), owner, "b1", "one-more.co.uk")).toMatchObject({ ok: false, status: 409 });
  });
  it("won't touch a website that isn't this tenant's", async () => {
    const s = { ...fresh(), brief: null };
    expect(await attachSiteDomain(fakeDb(s), owner, "b1", "hartley.co.uk")).toMatchObject({ ok: false, status: 404 });
    expect(s.domains).toEqual([]);
  });
});

describe("removeSiteDomain and listSiteDomains", () => {
  it("removes only this website's address, and only for the owner or an admin", async () => {
    const s = fresh();
    s.domains.push({ hostname: "hartley.co.uk", brief_id: "b1", tenant_id: "t1" }, { hostname: "other.co.uk", brief_id: "b2", tenant_id: "t1" });
    expect(await removeSiteDomain(fakeDb(s), { ...owner, role: "staff" }, "b1", "hartley.co.uk")).toMatchObject({ ok: false, status: 403 });
    expect(await removeSiteDomain(fakeDb(s), { ...owner, role: "admin" }, "b1", "hartley.co.uk")).toEqual({ ok: true });
    expect(s.domains.map((d) => d.hostname)).toEqual(["other.co.uk"]);
    // Another website's address can't be removed through this website.
    await removeSiteDomain(fakeDb(s), owner, "b1", "other.co.uk");
    expect(s.domains.map((d) => d.hostname)).toEqual(["other.co.uk"]);
  });
  it("lists a website's addresses for any staff", async () => {
    const s = fresh();
    s.domains.push({ hostname: "hartley.co.uk", brief_id: "b1", tenant_id: "t1", created_at: "2026-11-15" });
    const r = await listSiteDomains(fakeDb(s), owner, "b1");
    expect(r).toMatchObject({ ok: true, domains: [{ hostname: "hartley.co.uk" }] });
  });
});
