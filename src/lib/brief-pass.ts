import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * The brief pass: lets someone who has just sent the short "Own your website" form answer the six questions on the same
 * screen, before they have signed in. It is a signed token bound to ONE brief and it expires.
 *
 * What it allows is deliberately narrow and write-only: saving progress on that brief, and sending its answers once
 * (the routes also refuse once the brief has been sent). It can never read anything stored about the customer, and it
 * does not replace signing in for the proposal, the payment or the preview.
 *
 * It is stateless (signed, not stored), so it needs no database change. The key is derived from an existing server-only
 * secret, so it can't be used for anything else.
 */

export const BRIEF_PASS_HOURS = 48;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The key passes are signed with: derived from the server's secret, or null when there isn't one. */
export function briefPassKey(env: Record<string, string | undefined> = process.env): Buffer | null {
  const base = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return base ? createHmac("sha256", base).update("winjo-brief-pass-v1").digest() : null;
}

const sign = (key: Buffer, payload: string) => createHmac("sha256", key).update(payload).digest("base64url");

/** A pass for one brief, valid for BRIEF_PASS_HOURS. */
export function issueBriefPass(briefId: string, key: Buffer, now = Date.now()): string | null {
  if (!UUID.test(briefId)) return null;
  const expires = now + BRIEF_PASS_HOURS * 3_600_000;
  const payload = `${briefId.toLowerCase()}.${expires}`;
  return `${payload}.${sign(key, payload)}`;
}

/** True only for an unaltered, unexpired pass made for exactly this brief. */
export function briefPassValid(pass: unknown, briefId: string, key: Buffer, now = Date.now()): boolean {
  if (typeof pass !== "string" || pass.length > 200 || !UUID.test(briefId)) return false;
  const parts = pass.split(".");
  if (parts.length !== 3) return false;
  const [id, expiresRaw, signature] = parts;
  const expires = Number(expiresRaw);
  if (id !== briefId.toLowerCase() || !Number.isInteger(expires) || expires < now) return false;
  const expected = Buffer.from(sign(key, `${id}.${expiresRaw}`));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
