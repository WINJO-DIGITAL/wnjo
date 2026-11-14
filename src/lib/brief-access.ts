import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { briefPassKey, briefPassValid } from "./brief-pass";
import { customerFromRequest } from "./staff-auth";

/**
 * Who is calling a route that works on one brief: a signed-in customer (verified email), or someone holding a valid
 * brief pass for exactly that brief. A signed-in customer is always preferred. A pass is write-only: a route that
 * accepts it must still check the brief's route and stage, and must never read stored details back to a pass holder.
 */
export type BriefCaller = { kind: "customer"; userId: string; email: string } | { kind: "pass" };

export async function briefCaller(db: SupabaseClient, authorization: string | null, pass: unknown, briefId: string): Promise<BriefCaller | null> {
  const customer = await customerFromRequest(db, authorization);
  if (customer) return { kind: "customer", ...customer };
  const key = briefPassKey();
  return key && briefPassValid(pass, briefId, key) ? { kind: "pass" } : null;
}

/** A pass only ever works on a buy-outright brief that has not been sent yet. After it is sent, signing in is needed. */
export const PASS_STAGE = "brief_received";
export const PASS_ROUTE = "proposal";
