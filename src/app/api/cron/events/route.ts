import { NextResponse, type NextRequest } from "next/server";
import { serviceClient } from "@/lib/quote-store";
import { after } from "next/server";
import { kickWorker, processDueEvents, processQueuedTasks } from "@/lib/ai/sweep";
import { sendDueNotifications } from "@/lib/notify/send-due";
import { sendQuoteReminders } from "@/lib/quote-reminders-job";
import { providerFromEnv } from "@/lib/ai/agent-runtime";
import { runAutoDrafts } from "@/lib/ai/website-auto";
import { sendBriefDetailsReminders } from "@/lib/brief-reminders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Daily sweep: processes business events not yet handled (or failed and due a retry), runs queued tasks such as
 * those re-queued by an owner's approval, and sends any customer emails still waiting.
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
    if (tasks.hasMore) after(() => kickWorker(1));
    const notifications = await sendDueNotifications(db);
    const reminders = await sendQuoteReminders(db);
    // Any paid website still without its first AI draft (the key was missing, or a call failed) is picked up here.
    const drafts = await runAutoDrafts(db, providerFromEnv());
    const briefReminders = await sendBriefDetailsReminders(db);
    return NextResponse.json({ events, tasks, notifications, reminders, drafts, briefReminders });
  } catch {
    console.error("Event sweep failed");
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
