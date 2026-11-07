import { after, NextResponse, type NextRequest } from "next/server";
import { serviceClient } from "@/lib/quote-store";
import { kickWorker, processQueuedTasks } from "@/lib/ai/sweep";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// One invocation may run agent work for up to this long; anything unfinished pauses and continues in the next one.
export const maxDuration = 60;

/** A chain of continuations stops here, so a task that never finishes cannot keep the worker running forever. */
const MAX_CHAIN = 20;

/**
 * Runs queued agent work for a short time, then pauses. If work is left, it asks for another invocation. Vercel sends
 * CRON_SECRET as a bearer token; anything else is refused.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const db = serviceClient();
  if (!db) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const depth = Math.max(0, Math.min(MAX_CHAIN, Number(request.nextUrl.searchParams.get("depth") ?? 0) || 0));
  try {
    const result = await processQueuedTasks(db);
    if (result.hasMore && depth < MAX_CHAIN) {
      after(() => kickWorker(depth + 1));
    }
    return NextResponse.json({ ...result, depth });
  } catch {
    console.error("Task worker failed");
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
