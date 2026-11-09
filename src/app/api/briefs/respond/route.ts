import { NextResponse, type NextRequest } from "next/server";
import { proposalTransition, type ProposalStatus } from "@/lib/build-journey";
import { mailConfig, sendEnquiryEmail } from "@/lib/mailer";
import { serviceClient } from "@/lib/quote-store";
import { customerFromRequest } from "@/lib/staff-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * A customer accepts or declines a proposal sent to them. Only the person whose verified email is on the brief can
 * answer, only once, and only while it is "sent". Accepting moves the brief to payment; the payment link itself is
 * created by staff from the accepted figures, so the price can't change on the way.
 */
export async function POST(request: NextRequest) {
  const db = serviceClient();
  if (!db) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const customer = await customerFromRequest(db, request.headers.get("authorization"));
  if (!customer) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });

  const body = ((await request.json().catch(() => null)) ?? {}) as Record<string, unknown>;
  const id = typeof body.proposalId === "string" && UUID.test(body.proposalId) ? body.proposalId : null;
  const decision = body.decision === "accept" || body.decision === "decline" ? body.decision : null;
  const comment = typeof body.note === "string" ? body.note.trim().slice(0, 2000) : "";
  if (!id || !decision) return NextResponse.json({ error: "invalid" }, { status: 422 });

  const { data } = await db
    .from("website_proposals")
    .select("id, reference, status, brief_id, tenant_id, website_briefs!inner(id, email, name, stage, reference)")
    .eq("id", id)
    .maybeSingle();
  const p = data as
    | { id: string; reference: string; status: ProposalStatus; brief_id: string; tenant_id: string; website_briefs: { email: string; name: string; stage: string; reference: string } }
    | null;
  // Someone else's proposal looks exactly like a missing one.
  if (!p || p.website_briefs.email.toLowerCase() !== customer.email) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const step = proposalTransition(p.status, decision, "customer");
  if (!step.ok) return NextResponse.json({ error: "This proposal has already been answered." }, { status: 409 });

  const { data: changed, error } = await db
    .from("website_proposals")
    .update({ status: step.to, decided_at: new Date().toISOString(), customer_note: comment })
    .eq("id", p.id)
    .eq("status", "sent")
    .select("id");
  if (error || !changed?.length) return NextResponse.json({ error: "This proposal has already been answered." }, { status: 409 });

  const actor = { tenant_id: p.tenant_id, brief_id: p.brief_id, actor_type: "customer", actor_user: customer.userId, actor_email: customer.email };
  await db.from("website_brief_events").insert({ ...actor, kind: "proposal", detail: { action: decision, proposalId: p.id, reference: p.reference, note: comment } });
  if (decision === "accept") {
    const from = p.website_briefs.stage;
    await db.from("website_briefs").update({ stage: "awaiting_payment" }).eq("id", p.brief_id);
    await db.from("website_brief_events").insert({ ...actor, kind: "stage", detail: { from, to: "awaiting_payment" } });
  }

  const config = mailConfig();
  if (config) {
    await sendEnquiryEmail(config, {
      subject: `Proposal ${p.reference} ${decision === "accept" ? "accepted" : "declined"} [${p.website_briefs.reference}]`,
      text: [
        `${p.website_briefs.name} has ${decision === "accept" ? "accepted" : "declined"} proposal ${p.reference}.`,
        comment ? `Their note: ${comment}` : "",
        decision === "accept" ? "Next: create the payment link from the accepted figures in Admin, Website builds." : "",
      ].filter(Boolean).join("\n"),
      replyTo: customer.email,
    });
  }
  return NextResponse.json({ ok: true, status: step.to });
}
