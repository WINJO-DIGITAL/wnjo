import { NextResponse, type NextRequest } from "next/server";
import { serviceClient } from "@/lib/quote-store";
import { processDueEvents } from "@/lib/ai/sweep";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Daily sweep for business events that were recorded but not yet processed (or failed and can be retried).
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
    const result = await processDueEvents(db);
    return NextResponse.json(result);
  } catch {
    console.error("Event sweep failed");
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
