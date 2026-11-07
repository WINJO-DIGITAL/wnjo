import { NextResponse, type NextRequest } from "next/server";
import { serviceClient } from "@/lib/quote-store";
import { processDueEvents, processQueuedTasks } from "@/lib/ai/sweep";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Daily sweep: processes business events not yet handled (or failed and due a retry), then runs queued tasks
 * such as those re-queued by an owner's approval.
 * Vercel sends CRON_SECRET as a bearer token; anything else is refused.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const db = serviceClient();
  if (!db) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  try {
    const events = await processDueEvents(db);
    const tasks = await processQueuedTasks(db);
    return NextResponse.json({ events, tasks });
  } catch {
    console.error("Event sweep failed");
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
