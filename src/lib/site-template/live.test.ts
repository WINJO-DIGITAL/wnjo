import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { livePhotoUrls, loadLiveSite } from "./live";
import { photoRef } from "./photos";
import { SAMPLE_BARBER } from "./sample";
import type { SiteContent } from "./schema";

type Rows = { site_domains?: unknown; website_briefs?: unknown; website_site_builds?: unknown };
const fakeDb = (rows: Rows) =>
  ({
    from(table: keyof Rows) {
      const b: Record<string, unknown> = {};
      for (const m of ["select", "eq", "order", "limit"]) b[m] = () => b;
      b.maybeSingle = async () => ({ data: rows[table] ?? null, error: null });
      return b;
    },
  }) as unknown as SupabaseClient;

const domain = { brief_id: "b1", tenant_id: "t1" };
const live = { stage: "live", brief: { files: [{ path: "drafts/x/a.jpg", type: "image/jpeg" }, { path: 5 }] } };
const build = { id: "build1", content: SAMPLE_BARBER, released_at: "2026-11-14T10:00:00Z" };

describe("loadLiveSite", () => {
  it("returns the site when the address is attached, the brief is live and a build is released", async () => {
    const site = await loadLiveSite(fakeDb({ site_domains: domain, website_briefs: live, website_site_builds: build }), "hartley.example");
    expect(site).toMatchObject({ buildId: "build1", briefId: "b1", tenantId: "t1", releasedAt: "2026-11-14T10:00:00Z" });
    expect(site?.files).toEqual([{ path: "drafts/x/a.jpg", type: "image/jpeg" }]);
  });
  it("shows nothing for an address nobody attached", async () => {
    expect(await loadLiveSite(fakeDb({}), "nobody.example")).toBeNull();
  });
  it("shows nothing until the brief is live, so the approvals can't be skipped by attaching an address", async () => {
    for (const stage of ["preview", "approval", "building", "closed", "on_hold"]) {
      expect(await loadLiveSite(fakeDb({ site_domains: domain, website_briefs: { ...live, stage }, website_site_builds: build }), "h.example"), stage).toBeNull();
    }
  });
  it("shows nothing without a released build", async () => {
    expect(await loadLiveSite(fakeDb({ site_domains: domain, website_briefs: live }), "h.example")).toBeNull();
  });
  it("shows nothing for a build whose content is not a site", async () => {
    expect(await loadLiveSite(fakeDb({ site_domains: domain, website_briefs: live, website_site_builds: { ...build, content: {} } }), "h.example")).toBeNull();
  });
});

describe("livePhotoUrls", () => {
  const content = (): SiteContent => ({
    ...SAMPLE_BARBER,
    business: { ...SAMPLE_BARBER.business, logo: photoRef("drafts/x/logo.png") },
    sections: [
      { kind: "hero", variant: "photo", headline: "H", intro: "I", cta: "C", image: photoRef("drafts/x/hero.jpg") },
      { kind: "gallery", heading: "G", images: [{ src: photoRef("drafts/x/one.jpg"), alt: "a" }, { src: photoRef("drafts/other/stolen.jpg"), alt: "b" }] },
    ],
  });
  const files = [{ path: "drafts/x/hero.jpg" }, { path: "drafts/x/one.jpg" }, { path: "drafts/x/logo.png" }];

  it("sizes each picture for where it is used", () => {
    const urls = livePhotoUrls(content(), files);
    expect(urls.get(photoRef("drafts/x/hero.jpg"))).toBe("/photo?f=drafts%2Fx%2Fhero.jpg&w=1600");
    expect(urls.get(photoRef("drafts/x/one.jpg"))).toBe("/photo?f=drafts%2Fx%2Fone.jpg&w=900");
    expect(urls.get(photoRef("drafts/x/logo.png"))).toBe("/photo?f=drafts%2Fx%2Flogo.png&w=800");
  });
  it("gives no link to a file that isn't this website's own", () => {
    expect(livePhotoUrls(content(), files).has(photoRef("drafts/other/stolen.jpg"))).toBe(false);
  });
});
