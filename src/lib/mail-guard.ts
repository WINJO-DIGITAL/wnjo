/**
 * Addresses that must not be emailed from production. `.test` and `.example` are reserved
 * (RFC 2606), as are example.com, example.org and example.net. Mail to them sits undelivered.
 */

const RESERVED_HOST =
  /^(.*\.)?example\.(com|org|net)$|\.example$|\.test$|\.invalid$|\.localhost$/i;

/** True when this process is the production deployment. Preview builds are left alone. */
export function isProductionMail(): boolean {
  if (process.env.VERCEL_ENV) return process.env.VERCEL_ENV === "production";
  return process.env.NODE_ENV === "production";
}

/** The host of an email address, or an empty string when there isn't one. */
export function mailHost(address: string): string {
  const at = address.trim().toLowerCase().lastIndexOf("@");
  return at === -1 ? "" : address.trim().toLowerCase().slice(at + 1);
}

/** True for a reserved or non-existent domain that production must not try to deliver to. */
export function isReservedRecipient(address: string): boolean {
  const host = mailHost(address);
  if (!host || host.includes(" ")) return false;
  return RESERVED_HOST.test(host);
}
