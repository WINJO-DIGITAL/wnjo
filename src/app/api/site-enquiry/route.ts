import { NextResponse, type NextRequest } from "next/server";
import { notificationMailConfig, sendEmail } from "@/lib/mailer";
import { serviceClient } from "@/lib/quote-store";
import { sharedRateLimited } from "@/lib/rate-limit-shared";
import { parseSiteEnquiry, siteEnquiryEmail } from "@/lib/site-template/enquiry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOKEN = /^[A-Za-z0-9_-]{20,64}$/;
/** The page the form was on, by its short name. Anything else is ignored and the visitor goes back to Home. */
const PAGE = /^[a-z]{0,20}$/;

type Row = {
  id: string;
  tenant_id: string;
  brief_id: string;
  status: string;
  content: { business?: { name?: string } } | null;
  website_briefs: { email: string; business_name: string | null; name: string } | null;
};

/**
 * The booking-request form on a customer's template site. It posts as a plain HTML form, so it works without
 * JavaScript, and it answers with a redirect back to the page with a confirmation or a plain error.
 * - Only a released build takes requests. A draft is a private preview and must never send anything.
 * - The email goes to the website owner's verified account address, never to an address from the request, so the
 *   form can't be used to email a stranger.
 * - Rate limited per visitor and per website, with a hidden field that catches bots.
 * - The request is saved before the email goes, so it is kept even if the email fails. The visitor is only told it was
 *   sent once the owner has been emailed, because there is no other place yet where the owner would see it.
 */
export async function POST(request: NextRequest) {
  const form = await request.formData().catch(() => null);
  const token = typeof form?.get("token") === "string" ? (form!.get("token") as string) : "";
  if (!form || !TOKEN.test(token)) return new NextResponse(null, { status: 404 });
  const rawPage = form.get("page");
  const page = typeof rawPage === "string" && PAGE.test(rawPage) ? rawPage : "";
  const back = (sent: boolean) => NextResponse.redirect(new URL(`/site-preview/${token}?${page ? `page=${page}&` : ""}sent=${sent ? 1 : 0}#book`, request.url), 303);

  const db = serviceClient();
  if (!db) return back(false);
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if ((await sharedRateLimited(db, "site-enquiry-ip", ip, 5, 600)) || (await sharedRateLimited(db, "site-enquiry-site", token, 20, 3600))) return back(false);

  const { data } = await db
    .from("website_site_builds")
    .select("id, tenant_id, brief_id, status, content, website_briefs(email, business_name, name)")
    .eq("access_token", token)
    .maybeSingle();
  const row = data as unknown as Row | null;
  if (!row || row.status !== "released" || !row.website_briefs?.email) return new NextResponse(null, { status: 404 });

  const parsed = parseSiteEnquiry(Object.fromEntries(form.entries()));
  // A bot is told it worked, and nothing is sent.
  if (!parsed.ok) return back(Boolean(parsed.spam));
  const { name, contact, message } = parsed.enquiry;

  // Save first. If the table isn't there yet or the write fails, the email still goes, so nothing is lost either way.
  const { data: lead, error: saveError } = await db
    .from("site_enquiries")
    .insert({ tenant_id: row.tenant_id, brief_id: row.brief_id, build_id: row.id, page, name, contact, message })
    .select("id")
    .maybeSingle();
  if (saveError) console.error("site-enquiry: could not save the request", saveError.message);

  const config = notificationMailConfig();
  const businessName = row.content?.business?.name || row.website_briefs.business_name || row.website_briefs.name;
  const email = siteEnquiryEmail({ businessName, enquiry: parsed.enquiry });
  const sent = config ? await sendEmail(config, { to: row.website_briefs.email, subject: email.subject, text: email.text, replyTo: email.replyTo }, "Booking request") : false;
  if (!sent) console.error("site-enquiry: the owner was not emailed", { saved: Boolean(lead) });
  if (lead && sent) await db.from("site_enquiries").update({ email_sent: true }).eq("id", (lead as { id: string }).id);

  return back(sent);
}
