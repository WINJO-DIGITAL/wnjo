import type { SupabaseClient } from "@supabase/supabase-js";
import { routeFor, type Route } from "./build-journey";
import { BRIEF_VERSION, type WebsiteBrief } from "./website-brief";
import type { WebsiteAnswers, WebsiteQuote } from "./website-quote";

/**
 * Server-side storage for website briefs. Uses the service-role client: callers have already checked who is asking.
 * Every brief change also writes a version row and an event, which the database keeps append-only.
 */

export const BRIEF_BUCKET = "brief-files";

/** Keeps only the uploaded files that are really in this draft's storage folder. */
export async function confirmBriefFiles(db: SupabaseClient, draftId: string, brief: WebsiteBrief): Promise<WebsiteBrief> {
  if (brief.files.length === 0) return brief;
  const { data, error } = await db.storage.from(BRIEF_BUCKET).list(`drafts/${draftId}`, { limit: 100 });
  if (error || !data) return { ...brief, files: [] };
  const present = new Set(data.map((o) => `drafts/${draftId}/${o.name}`));
  return { ...brief, files: brief.files.filter((f) => present.has(f.path)) };
}

export type NewBrief = {
  tenantId: string;
  reference: string;
  email: string;
  name: string;
  businessName: string;
  draftId: string | null;
  brief: WebsiteBrief;
  answers: WebsiteAnswers;
  quote: WebsiteQuote;
};

export function briefFigures(quote: WebsiteQuote) {
  return {
    mode: quote.mode,
    package: quote.packageName,
    setup: quote.setup,
    monthly: quote.monthly,
    oneOffTotal: quote.oneOffTotal,
    initialPayment: quote.initialPayment,
    requiresQuote: quote.requiresQuote,
    quoteReasons: quote.quoteReasons,
  };
}

/** Saves a new brief with its first version and a "created" event. Returns its route, or null if it wasn't saved. */
export async function createBrief(db: SupabaseClient, input: NewBrief): Promise<{ id: string; route: Route } | null> {
  const figures = briefFigures(input.quote);
  const route = routeFor(figures);
  const brief = { ...input.brief, schema: BRIEF_VERSION };
  const { data, error } = await db
    .from("website_briefs")
    .insert({
      tenant_id: input.tenantId,
      reference: input.reference,
      email: input.email.toLowerCase(),
      name: input.name,
      business_name: input.businessName,
      route,
      draft_id: input.draftId,
      brief,
      answers: input.answers,
      figures,
    })
    .select("id")
    .single();
  if (error || !data) {
    console.error(`Brief save failed: ${error?.code ?? "unknown"}`);
    return null;
  }
  const id = (data as { id: string }).id;
  const [v, e] = await Promise.all([
    db.from("website_brief_versions").insert({
      tenant_id: input.tenantId,
      brief_id: id,
      version: 1,
      brief,
      answers: input.answers,
      changed_by_type: "customer",
    }),
    db.from("website_brief_events").insert({
      tenant_id: input.tenantId,
      brief_id: id,
      kind: "created",
      detail: { route, stage: "brief_received" },
      actor_type: "customer",
      actor_email: input.email.toLowerCase(),
    }),
  ]);
  if (v.error || e.error) console.error("Brief history save failed");
  return { id, route };
}
