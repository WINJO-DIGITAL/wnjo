import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * The browser client for customer accounts. It uses the publishable key, which is
 * safe to ship to the browser: the database's row-level security limits each signed-in
 * customer to their own orders. Returns null until the environment is configured, so
 * the rest of the site still builds and runs without it.
 */
let client: SupabaseClient | null | undefined;

export function supabase(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  client = url && key ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true } }) : null;
  return client;
}
