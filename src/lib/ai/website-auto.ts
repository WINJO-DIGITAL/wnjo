import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AiProvider } from "./provider";
import { parseAnswers } from "@/lib/site-template/answers";
import { runSiteBuildStep } from "@/lib/site-template/build-service";
import { ALL_LOOKS, answersFromProfile, buildableSectors, pickTemplate } from "@/lib/site-template/choose";
import { GENERAL_PRESET, presetFor } from "@/lib/site-template/presets";
import type { RawAnswers, SiteAnswers } from "@/lib/site-template/answers";
import type { Look } from "@/lib/site-template/schema";
import type { WebsiteBrief } from "@/lib/website-brief";
import { alertOwner, buildFailedMessage, readyForReviewMessage } from "./owner-alerts";
import { logEvent, runPlanStep, runPreviewStep, type Actor } from "./website-ai-service";
import { SupabaseWebsiteAiStore } from "./website-ai-store";

/** Two failed tries at one website, then it is left for the owner rather than spending more. */
export const MAX_FAILED_TRIES = 2;
const CLAIM_WINDOW_MS = 10 * 60_000;
const FALLBACK_COLOUR = "#1f3a34";

type BriefRow = {
  id: string;
  tenant_id: string;
  reference: string;
  email: string;
  name: string;
  business_name: string | null;
  brief: (Partial<WebsiteBrief> & { site?: SiteAnswers | null }) | null;
};

/**
 * The automatic first draft. Once a paying customer has sent their goals, the AI works through the same steps every
 * time, and a person sees the result before the customer does:
 *
 *   1. plan the website from the goals,
 *   2. choose the template (one of eleven sectors in one of four looks) that fits the plan,
 *   3. build it from the customer's answers, and run the automatic checks,
 *   4. email the owner that it is ready for review (or needs a look).
 *
 * It only ever drafts. The owner releases a build to the customer, so nothing here is seen by a customer. With no AI
 * key, nothing runs and the builds wait for staff. Bounded per call, so a slow model can't pile up work.
 */
export async function runAutoDrafts(db: SupabaseClient, provider: AiProvider | null, limit = 2): Promise<{ attempted: number; drafted: number }> {
  if (!provider) return { attempted: 0, drafted: 0 };
  const { data } = await db
    .from("website_briefs")
    .select("id, tenant_id, reference, email, name, business_name, brief")
    .in("stage", ["specification", "building"])
    .order("created_at", { ascending: true })
    .limit(limit * 5);
  let attempted = 0;
  let drafted = 0;
  for (const brief of (data ?? []) as BriefRow[]) {
    if (attempted >= limit) break;
    if (!(await needsDraft(db, brief))) continue;
    if (!(await claim(db, brief))) continue;
    attempted += 1;
    try {
      const outcome = await draftWebsite(db, provider, brief);
      if (outcome === "drafted" || outcome === "text") drafted += 1;
    } catch (error) {
      console.error(`Automatic draft failed: ${error instanceof Error ? error.message : "unknown"}`);
    }
  }
  return { attempted, drafted };
}

/** A paid website the customer has told us about, with no draft yet and tries left. */
async function needsDraft(db: SupabaseClient, brief: BriefRow): Promise<boolean> {
  const hasAnswers = Boolean(brief.brief?.site) || Boolean(brief.brief?.goals?.length);
  if (!hasAnswers) return false; // A short checkout pays before the brief is filled in. Nothing is drafted until the goals are in.
  const [{ data: built }, { data: previewed }] = await Promise.all([
    db.from("website_site_builds").select("id").eq("brief_id", brief.id).limit(1).maybeSingle(),
    db.from("website_previews").select("id").eq("brief_id", brief.id).limit(1).maybeSingle(),
  ]);
  if (built || previewed) return false;
  return (await failedTries(db, brief.id)) < MAX_FAILED_TRIES;
}

async function failedTries(db: SupabaseClient, briefId: string): Promise<number> {
  const { data } = await db.from("website_brief_events").select("detail").eq("brief_id", briefId).eq("kind", "ai").eq("actor_type", "system").limit(20);
  return ((data ?? []) as { detail: { ok?: boolean; step?: string } | null }[]).filter((e) => e.detail?.ok === false && e.detail.step !== "template").length;
}

/**
 * Two things can start a draft at once: the customer sending their goals, and the daily sweep. The first to write a
 * "started" note wins; the other leaves the website alone. A claim lapses after ten minutes, in case a run died.
 */
async function claim(db: SupabaseClient, brief: BriefRow): Promise<boolean> {
  const token = randomUUID();
  const actor: Actor = { userId: null, email: null, tenantId: brief.tenant_id, kind: "system" };
  await logEvent(db, actor, brief.id, "ai", { step: "started", token });
  const since = new Date(Date.now() - CLAIM_WINDOW_MS).toISOString();
  const { data } = await db
    .from("website_brief_events")
    .select("detail")
    .eq("brief_id", brief.id)
    .eq("kind", "ai")
    .gte("created_at", since)
    .order("created_at", { ascending: true })
    .limit(20);
  const first = ((data ?? []) as { detail: { step?: string; token?: string } | null }[]).find((e) => e.detail?.step === "started");
  return !first?.detail?.token || first.detail.token === token;
}

/** `fresh` makes a new plan instead of reusing the last. `by` is the person regenerating, who sees the result and needs no email. */
export type DraftOptions = { fresh?: boolean; by?: Actor; /** Told why, when no template could be built and a words-only draft was made instead. */ onFallback?: (reason: string) => void };

export async function draftWebsite(db: SupabaseClient, provider: AiProvider, brief: BriefRow, options: DraftOptions = {}): Promise<"drafted" | "text" | "waiting" | "failed"> {
  const actor: Actor = options.by ?? { userId: null, email: null, tenantId: brief.tenant_id, kind: "system" };
  const alert: typeof alertOwner = options.by ? async () => {} : alertOwner;
  const businessName = brief.business_name || brief.name;
  const who = { reference: brief.reference, businessName, email: brief.email };
  const site = brief.brief?.site ?? null;

  // What can be built, from what the customer told us. A customer who ticked a sector keeps it.
  let answers: RawAnswers | null;
  let sectors: string[];
  if (site) {
    const preset = presetFor(site.sector);
    if (!preset || !parseAnswers(site.answers, preset, { colour: FALLBACK_COLOUR }).ok) return "waiting";
    answers = site.answers;
    sectors = [site.sector];
  } else {
    answers = brief.brief ? answersFromProfile(brief.brief as WebsiteBrief, businessName) : null;
    // Any business can be built: the specific sectors that fit what they told us, and the general template for the rest.
    sectors = answers ? buildableSectors(answers) : [];
  }

  // Step 1: the plan.
  const store = new SupabaseWebsiteAiStore(db, brief.tenant_id, null);
  let plan = options.fresh ? null : await store.latestPlan(brief.id);
  if (!plan) {
    const made = await runPlanStep(db, actor, provider, brief.id);
    if (!made.ok) return await failed(db, brief, who, made.error);
    plan = await store.latestPlan(brief.id);
  }
  if (!plan) return await failed(db, brief, who, "The plan could not be read back.");

  const textDraft = async (): Promise<"text" | "failed"> => {
    // Say why, in the history and to whoever started it: a words-only draft is a fallback, never a quiet default.
    const general = answers ? parseAnswers(answers, GENERAL_PRESET, { colour: FALLBACK_COLOUR }) : null;
    const reason = !answers ? "They haven't described their business, so there was nothing to build a template from." : general && !general.ok ? (Object.values(general.errors)[0] ?? "Their answers don't fit a template yet.") : "Their answers don't fit a template yet.";
    await logEvent(db, actor, brief.id, "ai", { step: "template", ok: false, sector: null, reason, costPence: 0 });
    options.onFallback?.(reason);
    const preview = await runPreviewStep(db, actor, provider, brief.id);
    if (!preview.ok) return await failed(db, brief, who, preview.error);
    await alert(who, readyForReviewMessage({ ...who, checksOk: true, issues: 0, kind: "text" }));
    return "text";
  };

  // No template fits what they told us (for example, opening hours are needed and weren't given in a form we can use):
  // a text-only draft, as before.
  if (!answers || sectors.length === 0) return await textDraft();

  // Step 2: the template. The customer's own look is kept; anything they left open, the AI chooses from the plan.
  const asked = ALL_LOOKS.includes(answers.look as Look) ? (answers.look as Look) : null;
  const picked = await pickTemplate(provider, {
    businessName,
    businessType: site ? (presetFor(site.sector)?.label ?? site.sector) : (brief.brief?.otherBusinessType ?? ""),
    brief: { goals: brief.brief?.goals ?? [], goalNote: brief.brief?.goalNote ?? "", style: brief.brief?.style ?? null, colours: brief.brief?.colours ?? "" },
    plan: plan.plan,
    sectors,
    looks: asked ? [asked] : ALL_LOOKS,
  });
  if (!picked.ok) {
    // A customer's sector with the look left to the AI still builds: the sector's own look is used.
    if (!site) return await failed(db, brief, who, picked.reason);
  }
  const choice = picked.ok ? picked.choice : { sector: site!.sector, look: asked ?? presetFor(site!.sector)!.defaultLook };
  await logEvent(db, actor, brief.id, "ai", { step: "template", ok: picked.ok, sector: choice.sector, look: choice.look, costPence: picked.costPence, by: sectors.length === 1 && site ? "customer" : "ai" });

  // Step 3: the build and its checks.
  const result = await runSiteBuildStep(db, actor, provider, brief.id, { sector: choice.sector, answers: { ...answers, look: choice.look } });
  if (!result.ok) return await failed(db, brief, who, result.error);

  // Step 4: tell the owner.
  await alert(who, readyForReviewMessage({ ...who, checksOk: result.checksOk, issues: result.issues, sector: choice.sector, look: choice.look, kind: "template" }));
  return "drafted";
}

/** A failed try is recorded by the step itself. On the last try the owner is told, so a stuck website isn't silent. */
async function failed(db: SupabaseClient, brief: BriefRow, who: { reference: string; businessName: string; email: string }, reason: string): Promise<"failed"> {
  if ((await failedTries(db, brief.id)) >= MAX_FAILED_TRIES) await alertOwner(who, buildFailedMessage(who, reason));
  return "failed";
}

/** Staff regenerate a website from scratch: a new plan, a new template choice and a new build. It makes a draft only. */
export async function regenerateWebsite(db: SupabaseClient, provider: AiProvider, by: Actor, briefId: string): Promise<{ ok: true; outcome: "drafted" | "text"; note?: string } | { ok: false; status: number; error: string }> {
  const { data } = await db
    .from("website_briefs")
    .select("id, tenant_id, reference, email, name, business_name, brief")
    .eq("id", briefId)
    .eq("tenant_id", by.tenantId)
    .maybeSingle();
  const brief = data as BriefRow | null;
  if (!brief) return { ok: false, status: 404, error: "not_found" };
  if (!brief.brief?.site && !brief.brief?.goals?.length) return { ok: false, status: 409, error: "The customer hasn't sent their goals yet." };
  let note: string | undefined;
  const outcome = await draftWebsite(db, provider, brief, { fresh: true, by, onFallback: (reason) => (note = `No template could be built, so this is a words-only draft. ${reason}`) });
  if (outcome === "waiting") return { ok: false, status: 409, error: "The customer's answers aren't complete enough to build a template site yet." };
  if (outcome === "failed") return { ok: false, status: 502, error: "The AI couldn't finish the website. The reason is in the website's history." };
  return { ok: true, outcome, ...(note ? { note } : {}) };
}
