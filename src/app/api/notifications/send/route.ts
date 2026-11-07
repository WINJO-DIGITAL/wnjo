import { NextResponse, type NextRequest } from "next/server";
import { serviceClient } from "@/lib/quote-store";
import { sendDueNotifications } from "@/lib/notify/send-due";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Sends the customer emails queued by recent updates, so a client hears about progress straight away. Only signed-in
 * agency staff can trigger it (their own sign-in token, checked here). The daily sweep also sends anything left.
 */
export async function POST(request: NextRequest) {
  const db = serviceClient();
  if (!db) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!token) return NextResponse.json({ error: "sign_in" }, { status: 401 });
  const { data: userData, error: userError } = await db.auth.getUser(token);
  if (userError || !userData.user) return NextResponse.json({ error: "sign_in" }, { status: 401 });
  const { data: member } = await db
    .from("tenant_members")
    .select("user_id")
    .eq("user_id", userData.user.id)
    .in("role", ["owner", "admin", "staff"])
    .limit(1);
  if (!member || member.length === 0) return NextResponse.json({ error: "not_found" }, { status: 404 });

  try {
    const result = await sendDueNotifications(db);
    if (!result) return NextResponse.json({ error: "mail_not_configured" }, { status: 503 });
    return NextResponse.json(result);
  } catch {
    console.error("Customer notification sending failed");
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
