import { NextResponse, type NextRequest } from "next/server";
import { notificationMailConfig, sendEmail } from "@/lib/mailer";
import { serviceClient } from "@/lib/quote-store";
import { sharedRateLimited } from "@/lib/rate-limit-shared";
import { parseSiteEnquiry, siteEnquiryEmail } from "@/lib/site-template/enquiry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOKEN = /^[A-Za-z0-9_-]{20,64}$/;

type Row = { status: string; content: { business?: { name?: string } } | null; website_briefs: { email: string; business_name: string | null; name: string } | null };

/**
 * The booking-request form on a customer's template site. It posts as a plain HTML form, so it works without
 * JavaScript, and it answers with a redirect back to the page with a confirmation or a plain error.
 * - Only a released build takes requests. A draft is a private preview and must never send anything.
 * - The email goes to the website owner's verified account address, never to an address from the request, so the
 *   form can't be used to email a stranger.
 * - Rate limited per visitor and per website, with a hidden field that catches bots.
 */
export async function POST(request: NextRequest) {
  const form = await request.formData().catch(() => null);
  const token = typeof form?.get("token") === "string" ? (form!.get("token") as string) : "";
  if (!form || !TOKEN.test(token)) return new NextResponse(null, { status: 404 });
  const back = (sent: boolean) => NextResponse.redirect(new URL(`/site-preview/${token}?sent=${sent ? 1 : 0}#book`, request.url), 303);

  const db = serviceClient();
  if (!db) return back(false);
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if ((await sharedRateLimited(db, "site-enquiry-ip", ip, 5, 600)) || (await sharedRateLimited(db, "site-enquiry-site", token, 20, 3600))) return back(false);

  const { data } = await db.from("website_site_builds").select("status, content, website_briefs(email, business_name, name)").eq("access_token", token).maybeSingle();
  const row = data as unknown as Row | null;
  if (!row || row.status !== "released" || !row.website_briefs?.email) return new NextResponse(null, { status: 404 });

  const parsed = parseSiteEnquiry(Object.fromEntries(form.entries()));
  // A bot is told it worked, and nothing is sent.
  if (!parsed.ok) return back(Boolean(parsed.spam));

  const config = notificationMailConfig();
  if (!config) return back(false);
  const businessName = row.content?.business?.name || row.website_briefs.business_name || row.website_briefs.name;
  const email = siteEnquiryEmail({ businessName, enquiry: parsed.enquiry });
  const sent = await sendEmail(config, { to: row.website_briefs.email, subject: email.subject, text: email.text, replyTo: email.replyTo }, "Booking request");
  return back(sent);
}
