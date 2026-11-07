import { after, NextResponse, type NextRequest } from "next/server";
import { serviceClient } from "@/lib/quote-store";
import { verifyStripeSignature } from "@/lib/stripe";
import { recordEvent } from "@/lib/ai/event-store";
import { processDueEvents } from "@/lib/ai/sweep";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Stripe calls this when a payment completes. The signature is checked before anything is read or
 * changed; an unsigned or replayed request is refused. Only a paid Checkout Session marks a deposit paid.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim() ?? "";
  if (!secret) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const payload = await request.text();
  const now = Math.floor(Date.now() / 1000);
  if (!verifyStripeSignature(payload, request.headers.get("stripe-signature"), secret, now)) {
    return NextResponse.json({ error: "bad_signature" }, { status: 400 });
  }

  const event = JSON.parse(payload) as {
    type?: string;
    data?: { object?: { id?: string; payment_status?: string; payment_intent?: string | null } };
  };
  const session = event.data?.object;
  if (event.type !== "checkout.session.completed" || !session?.id || session.payment_status !== "paid") {
    return NextResponse.json({ received: true, handled: false });
  }

  const db = serviceClient();
  if (!db) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const { error } = await db
    .from("deposits")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      stripe_payment_intent_id: session.payment_intent ?? null,
    })
    .eq("stripe_checkout_session_id", session.id)
    .neq("status", "paid");
  // A database error asks Stripe to retry the event rather than losing the payment.
  if (error) return NextResponse.json({ error: "retry" }, { status: 500 });

  // Look the deposit up on every delivery, not just the first. If recording the event fails and Stripe retries,
  // the update above matches nothing, but this lookup still finds the paid deposit, so the event is recorded then.
  const { data: deposit, error: lookupError } = await db
    .from("deposits")
    .select("id, tenant_id")
    .eq("stripe_checkout_session_id", session.id)
    .eq("status", "paid")
    .maybeSingle();
  if (lookupError) return NextResponse.json({ error: "retry" }, { status: 500 });
  if (!deposit) return NextResponse.json({ received: true, handled: true });
  try {
    await recordEvent(db, {
      tenantId: (deposit as { tenant_id: string }).tenant_id,
      type: "deposit_paid",
      projectId: null,
      dedupeKey: `deposit_paid:${(deposit as { id: string }).id}`,
    });
  } catch {
    // The payment is recorded. Ask Stripe to retry, so the event is not lost; the retry is a no-op for the deposit.
    return NextResponse.json({ error: "retry" }, { status: 500 });
  }
  // Agents react straight away, but after the response is sent: a model call can be slow, and Stripe should not
  // wait for it. A failure here does not undo the payment; the event stays recorded and the daily sweep retries it.
  after(async () => {
    try {
      await processDueEvents(db);
    } catch {
      console.error("Event processing after deposit payment failed");
    }
  });
  return NextResponse.json({ received: true, handled: true });
}
