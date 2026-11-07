import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { serviceClient } from "@/lib/quote-store";
import { buildBriefing, londonDay, type BriefingFacts } from "@/lib/briefing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Called once a day by Vercel Cron (see vercel.json). Vercel sends the CRON_SECRET as a bearer token;
 * anything else is refused. For each agency it gathers the facts, writes one briefing for the day, and
 * skips agencies that already have today's briefing.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const db = serviceClient();
  if (!db) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const now = new Date();
  const day = londonDay(now);
  const { data: tenants, error: tenantError } = await db.from("tenants").select("id");
  if (tenantError) return NextResponse.json({ error: "failed" }, { status: 500 });

  const written: string[] = [];
  const skipped: string[] = [];
  for (const tenant of (tenants ?? []) as Array<{ id: string }>) {
    try {
      const facts = await gatherFacts(db, tenant.id, now);
      const briefing = buildBriefing(facts, day);
      const { error } = await db
        .from("ai_reports")
        .upsert(
          { tenant_id: tenant.id, kind: "morning_briefing", report_date: day, body: briefing },
          { onConflict: "tenant_id,kind,report_date", ignoreDuplicates: true },
        );
      if (error) throw error;
      written.push(tenant.id);
    } catch {
      // Log the agency only; error text can echo data, so it is not returned or logged.
      console.error(`Morning briefing failed for agency ${tenant.id}`);
      skipped.push(tenant.id);
    }
  }
  return NextResponse.json({ day, written: written.length, failed: skipped.length });
}

/** Reads the counts the briefing needs. Items the database doesn't track yet are left empty, not guessed. */
async function gatherFacts(db: SupabaseClient, tenantId: string, now: Date): Promise<BriefingFacts> {
  const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();

  const [projects, approvals, revisions, enquiries, failed, spend] = await Promise.all([
    db.from("projects").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).in("status", ["planning", "in_progress"]),
    db
      .from("approval_requests")
      .select("title, created_at, projects(name)")
      .eq("tenant_id", tenantId)
      .eq("status", "open")
      .order("created_at", { ascending: true })
      .limit(20),
    db.from("revision_requests").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("status", "open"),
    db.from("enquiries").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).gte("created_at", since24h),
    db.from("ai_tasks").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("status", "failed"),
    db.from("ai_tasks").select("spent_pence").eq("tenant_id", tenantId).gte("created_at", monthStart),
  ]);
  for (const result of [projects, approvals, revisions, enquiries, failed, spend]) {
    if (result.error) throw result.error;
  }

  type ApprovalRow = { title: string; created_at: string; projects: { name: string } | null };
  const spendRows = (spend.data ?? []) as Array<{ spent_pence: number }>;

  return {
    activeProjects: projects.count ?? 0,
    overdueMilestones: [],
    upcomingDeliveries: [],
    pendingApprovals: ((approvals.data ?? []) as unknown as ApprovalRow[]).map((a) => ({
      projectName: a.projects?.name ?? "Project",
      title: a.title,
      openSince: a.created_at.slice(0, 10),
    })),
    openRevisions: revisions.count ?? 0,
    unansweredClientMessages: [],
    newEnquiriesLast24h: enquiries.count ?? 0,
    failedAiTasks: failed.count ?? 0,
    aiSpendThisMonthPence: spendRows.reduce((sum, row) => sum + Number(row.spent_pence ?? 0), 0),
  };
}
