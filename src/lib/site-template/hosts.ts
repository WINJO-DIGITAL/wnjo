/**
 * Which address a request came to, and whether it is ours or a customer's website. Pure, so the proxy and the tests
 * share the same rules. A request to any address that isn't one of ours is a customer's live site.
 */

/** Our own addresses. A subdomain of winjodigital.co.uk other than www is not ours: it is a customer site. */
const OURS = new Set(["winjodigital.co.uk", "www.winjodigital.co.uk", "localhost", "127.0.0.1", "[::1]"]);

/** The host of a request, in lower case, without the port or a trailing dot. */
export function hostOf(header: string | null | undefined): string {
  return (header ?? "").trim().toLowerCase().replace(/:\d+$/, "").replace(/\.$/, "");
}

/**
 * Our own address, or a preview address (Vercel's). `extra` adds more, such as a staging domain, from the
 * MAIN_HOSTS setting.
 */
export function isMainHost(host: string, extra: readonly string[] = []): boolean {
  return !host || OURS.has(host) || host.endsWith(".vercel.app") || extra.includes(host);
}

/** The addresses named in the MAIN_HOSTS setting (comma separated). */
export const extraMainHosts = (value: string | undefined): string[] => (value ?? "").split(",").map((h) => hostOf(h)).filter(Boolean);

/** Where a request to a customer's address is served from inside the app. Null for one of our own addresses. */
export function siteRewritePath(host: string, pathname: string, extra: readonly string[] = []): string | null {
  if (isMainHost(host, extra)) return null;
  return `/sites/${host}${pathname === "/" ? "" : pathname}`;
}

const LABEL = "[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?";
const HOSTNAME = new RegExp(`^(?:${LABEL}\\.)+[a-z]{2,63}$`);

/**
 * A website address typed by staff, tidied: "https://Www.Example.co.uk/" becomes "www.example.co.uk". Null when it
 * isn't a plain domain name, or is one of ours (which a customer site must never take over).
 */
export function normaliseHostname(input: string, extra: readonly string[] = []): string | null {
  const host = hostOf(input.trim().replace(/^[a-z]+:\/\//i, "").replace(/[/?#].*$/, ""));
  if (host.length > 253 || !HOSTNAME.test(host) || isMainHost(host, extra)) return null;
  return host;
}

/** The public origin of a request, from the address the visitor used (not the one the server listens on). */
export function originOf(headers: { get(name: string): string | null }, host: string): string {
  const forwarded = headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const proto = forwarded || (process.env.NODE_ENV === "production" && process.env.E2E !== "1" ? "https" : "http");
  return `${proto}://${headers.get("host") ?? host}`;
}
