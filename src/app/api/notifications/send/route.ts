import { after, NextResponse, type NextRequest } from "next/server";
import { serviceClient } from "@/lib/quote-store";
import { sendDueNotifications } from "@/lib/notify/send-due";
import { kickWorker, processDueEvents } from "@/lib/ai/sweep";
import { LIMITS_PER_ROUTE, sharedRateLimited } from "@/lib/rate-limit-shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Processes business events and sends the customer emails already queued by a change, so a client hears about
 * progress straight away. It only works through rows the database and server have already written (each change is
 * sent once), but it is still limited to people who belong somewhere: staff of a tenant, or members of a client
 * organisation. A fresh sign-in with no account behind it is refused, and each person is rate limited.
 * The daily sweep does the same work for anything missed.
 */
export async function POST(request: NextRequest) {
  const db = serviceClient();
  if (!db) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!token) return NextResponse.json({ error: "sign_in" }, { status: 401 });
  const { data: userData, error: userError } = await db.auth.getUser(token);
  if (userError || !userData.user) return NextResponse.json({ error: "sign_in" }, { status: 401 });
  const userId = userData.user.id;

  const [{ data: staff }, { data: client }] = await Promise.all([
    db.from("tenant_members").select("user_id").eq("user_id", userId).limit(1),
    db.from("organization_members").select("user_id").eq("user_id", userId).limit(1),
  ]);
  if (!staff?.length && !client?.length) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const limit = LIMITS_PER_ROUTE.notify;
  if (await sharedRateLimited(db, "notify", userId, limit.max, limit.windowSeconds)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  try {
    // Business events first (a new message or project may need agent work), then the customer emails.
    const events = await processDueEvents(db);
    if (events.paused > 0) after(() => kickWorker(1));
    const mail = await sendDueNotifications(db);
    if (!mail) return NextResponse.json({ error: "mail_not_configured", events }, { status: 503 });
    return NextResponse.json({ events, mail });
  } catch {
    console.error("Customer notification sending failed");
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
