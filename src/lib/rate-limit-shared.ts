import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Rate limiting shared by every server instance, kept in the database (see the shared_rate_limit migration).
 * The identifier (an IP address or a user id) is hashed before it is stored, so no raw address is kept.
 * If the database can't be reached the request is allowed and the failure logged: a limiter outage must never
 * stop a genuine enquiry or payment. The in-memory limiter still applies as a first line where it is used.
 */
export function rateKey(scope: string, id: string): string {
  const digest = createHash("sha256").update(`${scope}:${id}`).digest("hex").slice(0, 40);
  return `${scope}:${digest}`;
}

export async function sharedRateLimited(
  db: SupabaseClient | null,
  scope: string,
  id: string,
  max: number,
  windowSeconds: number,
): Promise<boolean> {
  if (!db || !id) return false;
  try {
    const { data, error } = await db.rpc("rate_limit_hit", {
      p_key: rateKey(scope, id),
      p_max: max,
      p_window_seconds: windowSeconds,
    });
    if (error) {
      console.error(`Shared rate limit unavailable for ${scope}`);
      return false;
    }
    return data === true;
  } catch {
    console.error(`Shared rate limit unavailable for ${scope}`);
    return false;
  }
}

/** Limits per route, in one place so they are easy to review. */
export const LIMITS_PER_ROUTE = {
  enquiry: { max: 5, windowSeconds: 10 * 60 },
  checkout: { max: 10, windowSeconds: 10 * 60 },
  uploadUrl: { max: 40, windowSeconds: 10 * 60 },
  briefUpload: { max: 20, windowSeconds: 10 * 60 },
  briefDraft: { max: 120, windowSeconds: 10 * 60 },
  notify: { max: 30, windowSeconds: 10 * 60 },
} as const;
