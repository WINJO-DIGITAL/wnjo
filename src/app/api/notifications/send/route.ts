import { NextResponse, type NextRequest } from "next/server";
import { serviceClient } from "@/lib/quote-store";
import { sendDueNotifications } from "@/lib/notify/send-due";
import { processDueEvents } from "@/lib/ai/sweep";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Processes business events and sends the customer emails already queued by a change, so a client hears about
 * progress straight away. Any signed-in person can trigger it, because it only works through rows the database
 * and server have already written (each change is sent once). The daily sweep does the same work for anything missed.
 */
export async function POST(request: NextRequest) {
  const db = serviceClient();
  if (!db) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!token) return NextResponse.json({ error: "sign_in" }, { status: 401 });
  const { data: userData, error: userError } = await db.auth.getUser(token);
  if (userError || !userData.user) return NextResponse.json({ error: "sign_in" }, { status: 401 });

  try {
    // Business events first (a new message or project may need agent work), then the customer emails.
    const events = await processDueEvents(db);
    const mail = await sendDueNotifications(db);
    if (!mail) return NextResponse.json({ error: "mail_not_configured", events }, { status: 503 });
    return NextResponse.json({ events, mail });
  } catch {
    console.error("Customer notification sending failed");
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
