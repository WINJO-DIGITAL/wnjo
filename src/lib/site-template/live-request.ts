/**
 * The check every live-site route makes first: the request must have come to the customer's own address (never to
 * ours, where /sites/<address> is not a route for visitors), and that address must have a live site.
 */
import { extraMainHosts, hostOf, isMainHost } from "./hosts";
import { type LiveSite } from "./live";
import { liveSiteFor } from "./live-source";

export async function liveSiteForRequest(headers: { get(name: string): string | null }, wanted: string): Promise<{ host: string; site: LiveSite } | null> {
  const host = hostOf(headers.get("host"));
  if (!wanted || wanted !== host || isMainHost(host, extraMainHosts(process.env.MAIN_HOSTS))) return null;
  const site = await liveSiteFor(host);
  return site ? { host, site } : null;
}
