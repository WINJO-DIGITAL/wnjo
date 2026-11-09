import type { SupabaseClient } from "@supabase/supabase-js";
import type { Route, Stage } from "./build-journey";

/**
 * Moves a build along when money is involved. Both helpers are best effort and never throw: a payment or a Stripe
 * page must never fail because a stage couldn't be updated, and a stage is only moved from the stage a person
 * could really be in, so a late or repeated event can't drag a build backwards.
 */

/** The stages a build can be in when its customer pays. A bespoke build pays only after an accepted proposal. */
export const PAYABLE_FROM: Record<Route, Stage[]> = {
  package: ["brief_received", "reviewing", "awaiting_payment"],
  proposal: ["awaiting_payment"],
};

type BriefRow = { id: string; tenant_id: string; route: Route; stage: Stage };

async function findBrief(db: SupabaseClient, tenantId: string, reference: string): Promise<BriefRow | null> {
  const { data } = await db
    .from("website_briefs")
    .select("id, tenant_id, route, stage")
    .eq("reference", reference)
    .eq("tenant_id", tenantId)
    .maybeSingle();
  return (data as BriefRow | null) ?? null;
}

async function move(db: SupabaseClient, brief: BriefRow, to: Stage, note: string): Promise<boolean> {
  const from = brief.stage;
  const { data, error } = await db.from("website_briefs").update({ stage: to }).eq("id", brief.id).eq("stage", from).select("id");
  if (error || !((data ?? []) as unknown[]).length) return false;
  await db.from("website_brief_events").insert({
    tenant_id: brief.tenant_id,
    brief_id: brief.id,
    kind: "stage",
    detail: { from, to, note },
    actor_type: "system",
  });
  return true;
}

/** The customer is on their way to pay: show "Payment" on their timeline. Only for a build still at the start. */
export async function markAwaitingPayment(db: SupabaseClient, tenantId: string, reference: string): Promise<void> {
  try {
    const brief = await findBrief(db, tenantId, reference);
    if (!brief || (brief.stage !== "brief_received" && brief.stage !== "reviewing")) return;
    await move(db, brief, "awaiting_payment", "The customer went to pay.");
  } catch (error) {
    console.error(`Build not marked as awaiting payment: ${error instanceof Error ? error.message : "unknown"}`);
  }
}

/** The first payment has arrived: the build moves on to the plan ("AI processing"). */
export async function advanceAfterPayment(db: SupabaseClient, tenantId: string, reference: string | null | undefined): Promise<void> {
  if (!reference) return;
  try {
    const brief = await findBrief(db, tenantId, reference);
    if (!brief || !PAYABLE_FROM[brief.route].includes(brief.stage)) return;
    await move(db, brief, "specification", "Payment received.");
  } catch (error) {
    console.error(`Build not advanced after payment: ${error instanceof Error ? error.message : "unknown"}`);
  }
}
