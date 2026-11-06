import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { parseAnswers, type Answers } from "@/lib/pricing";
import { mapCatalogue, type CatalogueRows } from "@/lib/catalogue-mapping";
import { buildQuoteRecords, quoteReference } from "@/lib/quote-records";
import type { Catalogue } from "@/lib/quote-engine";

/**
 * Server-only quote storage. Uses the project's secret key, which must never reach the browser.
 * Returns null when the key is not configured, so the caller can report that honestly.
 */

export function serviceClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Loads a tenant's active catalogue from the database and maps it for the engine. */
export async function loadCatalogue(client: SupabaseClient, tenantId: string): Promise<Catalogue> {
  const [packages, features, rates, carePlans, settings] = await Promise.all([
    client.from("pricing_packages").select("code, name, base_price_pence, included_design, active").eq("tenant_id", tenantId),
    client
      .from("pricing_features")
      .select("code, label, price_pence, requires_scope, scope_note, included_in_packages, active")
      .eq("tenant_id", tenantId),
    client.from("pricing_rates").select("kind, code, band, amount_pence").eq("tenant_id", tenantId),
    client.from("pricing_care_plans").select("code, name, monthly_price_pence, active").eq("tenant_id", tenantId),
    client.from("pricing_settings").select("key, value").eq("tenant_id", tenantId),
  ]);
  for (const result of [packages, features, rates, carePlans, settings]) {
    if (result.error) throw new Error(`Could not load the pricing catalogue: ${result.error.message}`);
  }
  const rows: CatalogueRows = {
    packages: (packages.data ?? []) as CatalogueRows["packages"],
    features: (features.data ?? []) as CatalogueRows["features"],
    rates: (rates.data ?? []) as CatalogueRows["rates"],
    carePlans: (carePlans.data ?? []) as CatalogueRows["carePlans"],
    settings: (settings.data ?? []) as CatalogueRows["settings"],
  };
  return mapCatalogue(rows);
}

export type CreatedQuote = { quoteId: string; reference: string };

/**
 * Prices the answers from the tenant's catalogue and stores a new quote in one database transaction.
 * The browser never supplies a price: the figures are calculated here from the stored catalogue.
 */
export async function createQuote(input: {
  tenantId: string;
  organizationId: string | null;
  enquiryId: string | null;
  answers: unknown;
}): Promise<CreatedQuote> {
  const answers: Answers | null = parseAnswers(input.answers);
  if (!answers) throw new Error("The quote answers are incomplete or invalid");
  const client = serviceClient();
  if (!client) throw new Error("Quote storage is not configured (SUPABASE_SERVICE_ROLE_KEY is not set)");

  const catalogue = await loadCatalogue(client, input.tenantId);
  const reference = quoteReference(crypto.getRandomValues(new Uint8Array(4)));
  const records = buildQuoteRecords({
    tenantId: input.tenantId,
    reference,
    organizationId: input.organizationId,
    enquiryId: input.enquiryId,
    answers,
    catalogue,
    now: new Date(),
  });

  const { data, error } = await client.rpc("store_quote", {
    p_quote: records.quote,
    p_version: records.version,
    p_items: records.items,
  });
  if (error) throw new Error(`Could not store the quote: ${error.message}`);
  return { quoteId: data as string, reference };
}
