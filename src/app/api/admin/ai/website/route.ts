import { NextResponse, type NextRequest } from "next/server";
import { providerFromEnv } from "@/lib/ai/agent-runtime";
import { releasePreview, runPlanStep, runPreviewStep, withdrawPreview } from "@/lib/ai/website-ai-service";
import { previewReadyEmail } from "@/lib/build-emails";
import { notificationMailConfig, sendEmail } from "@/lib/mailer";
import { serviceClient } from "@/lib/quote-store";
import { sharedRateLimited } from "@/lib/rate-limit-shared";
import { staffFromRequest } from "@/lib/staff-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Writing every page of a website can take a while.
export const maxDuration = 300;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fail = (status: number, error: string) => NextResponse.json({ error }, { status });

/**
 * Staff actions for the AI website steps.
 * - plan: Grok drafts the website plan from the brief.
 * - preview: Grok writes the pages of the latest plan as a draft preview. An optional `change` applies a customer's request.
 * - release: a person sends a draft preview to the customer. Nothing the AI writes reaches a customer without this.
 * - withdraw: takes a released preview back.
 * - link: the private address of a preview, for staff to review it.
 * Making a plan or a preview needs the Grok key; releasing and withdrawing do not.
 */
export async function POST(request: NextRequest) {
  const db = serviceClient();
  if (!db) return fail(503, "not_configured");
  const staff = await staffFromRequest(db, request.headers.get("authorization"));
  if (!staff) return fail(401, "sign_in");
  if (await sharedRateLimited(db, "ai-website", staff.userId, 30, 3600)) return fail(429, "Too many AI requests this hour. Please try again later.");

  const body = ((await request.json().catch(() => null)) ?? {}) as Record<string, unknown>;
  const id = (key: string) => (typeof body[key] === "string" && UUID.test(body[key] as string) ? (body[key] as string) : null);

  if (body.action === "plan" || body.action === "preview") {
    const briefId = id("briefId");
    if (!briefId) return fail(422, "invalid");
    const provider = providerFromEnv();
    if (!provider) return fail(503, "The AI service isn't connected yet. It needs the Grok key.");
    const change = typeof body.change === "string" ? body.change.slice(0, 1000) : undefined;
    const result = body.action === "plan" ? await runPlanStep(db, staff, provider, briefId) : await runPreviewStep(db, staff, provider, briefId, change);
    return result.ok ? NextResponse.json(result) : fail(result.status, result.error);
  }

  if (body.action === "release") {
    const previewId = id("previewId");
    if (!previewId) return fail(422, "invalid");
    const result = await releasePreview(db, staff, previewId);
    if (!result.ok) return fail(result.status, result.error);
    const config = notificationMailConfig();
    if (config) {
      const site = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://winjodigital.co.uk";
      const email = previewReadyEmail({ name: result.name, reference: result.reference, accountUrl: `${site.replace(/\/+$/, "")}/account` });
      await sendEmail(config, { to: result.email, subject: email.subject, text: email.text }, "Preview ready");
    }
    return NextResponse.json({ ok: true, stage: result.stage });
  }

  if (body.action === "link") {
    const previewId = id("previewId");
    if (!previewId) return fail(422, "invalid");
    const { data } = await db.from("website_previews").select("access_token").eq("id", previewId).eq("tenant_id", staff.tenantId).maybeSingle();
    const token = (data as { access_token: string } | null)?.access_token;
    if (!token) return fail(404, "not_found");
    return NextResponse.json({ url: `${new URL(request.url).origin}/preview/${token}` });
  }

  if (body.action === "withdraw") {
    const previewId = id("previewId");
    if (!previewId) return fail(422, "invalid");
    const result = await withdrawPreview(db, staff, previewId);
    return result.ok ? NextResponse.json({ ok: true }) : fail(result.status, result.error);
  }

  return fail(422, "Unknown action.");
}
