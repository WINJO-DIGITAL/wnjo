/**
 * Where the public site page gets a customer's site from. In normal running that is the database. When the server is
 * started for the browser tests (E2E=1), addresses ending in .e2e.test are made-up sample sites instead; nothing else
 * changes, so the tests exercise the real routing, page and tags.
 */
import { buildE2ESample, e2eParamsFromHost } from "./e2e-sample";
import { loadLiveSite, publicSiteClient, type LiveSite } from "./live";

export async function liveSiteFor(host: string): Promise<LiveSite | null> {
  if (process.env.E2E === "1") {
    const params = e2eParamsFromHost(host);
    const sample = params && buildE2ESample(params);
    if (sample) return { buildId: "e2e", briefId: "e2e", tenantId: "e2e", content: sample.content, files: [], releasedAt: "2026-11-14T10:00:00Z" };
  }
  const db = publicSiteClient();
  return db ? loadLiveSite(db, host) : null;
}
