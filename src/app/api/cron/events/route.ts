import { NextResponse, type NextRequest } from "next/server";
import { serviceClient } from "@/lib/quote-store";
import { after } from "next/server";
import { kickWorker, processDueEvents, processQueuedTasks } from "@/lib/ai/sweep";
import { sendDueNotifications } from "@/lib/notify/send-due";
import { sendQuoteReminders } from "@/lib/quote-reminders-job";
import { providerFromEnv } from "@/lib/ai/agent-runtime";
import { runAutoDrafts } from "@/lib/ai/website-auto";
import { sendBriefDetailsReminders } from "@/lib/brief-reminders";
import { sendRenewalReminders } from "@/lib/renewal-reminders";

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
  // Each step runs on its own. One failing used to stop every step after it, including the customer reminders, so a
  // failure is now logged for that step only and the rest still run.
  const step = async <T,>(name: string, run: () => Promise<T>): Promise<T | { error: string }> => {
    try {
      return await run();
    } catch (error) {
      console.error(`Daily job step failed: ${name}: ${error instanceof Error ? error.message : "unknown"}`);
      return { error: name };
    }
  };
  const events = await step("events", () => processDueEvents(db));
  const tasks = await step("tasks", () => processQueuedTasks(db));
  if (tasks && typeof tasks === "object" && "hasMore" in tasks && tasks.hasMore) after(() => kickWorker(1));
  const notifications = await step("notifications", () => sendDueNotifications(db));
  const reminders = await step("quote reminders", () => sendQuoteReminders(db));
  // Any paid website still without its first AI draft (the key was missing, or a call failed) is picked up here.
  const drafts = await step("drafts", () => runAutoDrafts(db, providerFromEnv()));
  const briefReminders = await step("brief reminders", () => sendBriefDetailsReminders(db));
  // A reminder before each plan's minimum term ends and every six months after, saying how to cancel.
  const renewalReminders = await step("renewal reminders", () => sendRenewalReminders(db));
  return NextResponse.json({ events, tasks, notifications, reminders, drafts, briefReminders, renewalReminders });
}
