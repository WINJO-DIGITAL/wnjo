import { NextResponse, type NextRequest } from "next/server";
import { notificationMailConfig, sendEmail } from "@/lib/mailer";
import { serviceClient } from "@/lib/quote-store";
import { sharedRateLimited } from "@/lib/rate-limit-shared";
import { matchService, parseSiteEnquiry, PHOTO_MAX_BYTES, PHOTO_TYPES, serviceChoices, siteEnquiryEmail } from "@/lib/site-template/enquiry";
import type { SiteContent } from "@/lib/site-template/schema";
import { extraMainHosts, hostOf, isMainHost, originOf } from "@/lib/site-template/hosts";
import { loadLiveSite } from "@/lib/site-template/live";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PHOTO = new Set<string>(PHOTO_TYPES);

/** A picture small enough to email. Anything else is noted and left out, so the enquiry itself still goes. */
async function readPhoto(value: FormDataEntryValue | null): Promise<{ status?: "attached" | "skipped"; note: string; file?: { filename: string; content: string } }> {
  if (!(value instanceof File) || value.size === 0) return { note: "" };
  if (value.size > PHOTO_MAX_BYTES || !PHOTO.has(value.type)) return { status: "skipped", note: "Photo not included." };
  const filename = value.name.replace(/[^\w.\- ]+/g, "").replace(/^\.+/, "").slice(0, 80) || "photo";
  return { status: "attached", note: "Photo attached to the email.", file: { filename, content: Buffer.from(await value.arrayBuffer()).toString("base64") } };
}

const TOKEN = /^[A-Za-z0-9_-]{20,64}$/;
/** The page the form was on, by its short name. Anything else is ignored and the visitor goes back to Home. */
const PAGE = /^[a-z]{0,20}$/;

type Row = {
  id: string;
  tenant_id: string;
  brief_id: string;
  status: string;
  content: SiteContent | null;
  website_briefs: { email: string; business_name: string | null; name: string } | null;
};

/**
 * The booking-request form on a customer's template site. It posts as a plain HTML form, so it works without
 * JavaScript, and it answers with a redirect back to the page with a confirmation or a plain error.
 * - Only a released build takes requests. A draft is a private preview and must never send anything.
 * - The email goes to the website owner's verified account address, never to an address from the request, so the
 *   form can't be used to email a stranger.
 * - Rate limited per visitor and per website, with a hidden field that catches bots.
 * - It serves two kinds of site. A private preview posts with its token. A live site posts without one, and the address
 *   it was posted to says which website it is for (and only a live site on that address will do).
 * - The request is saved before the email goes, so it is kept even if the email fails. The visitor is only told it was
 *   sent once the owner has been emailed, because there is no other place yet where the owner would see it.
 */
export async function POST(request: NextRequest) {
  const form = await request.formData().catch(() => null);
  const token = typeof form?.get("token") === "string" ? (form!.get("token") as string) : "";
  const host = hostOf(request.headers.get("host") ?? new URL(request.url).host);
  // No token on a customer's own address means the live site; anywhere else a token is required.
  const live = !token && !isMainHost(host, extraMainHosts(process.env.MAIN_HOSTS));
  if (!form || (!live && !TOKEN.test(token))) return new NextResponse(null, { status: 404 });
  const rawPage = form.get("page");
  const page = typeof rawPage === "string" && PAGE.test(rawPage) ? rawPage : "";
  const back = (sent: boolean) => {
    const path = live ? `/${page}` : `/site-preview/${token}`;
    const query = `${!live && page ? `page=${page}&` : ""}sent=${sent ? 1 : 0}`;
    // A live site goes back to the address the visitor used; a preview to ours.
    return NextResponse.redirect(new URL(`${path}?${query}#book`, live ? originOf(request.headers, host) : request.url), 303);
  };

  const db = serviceClient();
  if (!db) return back(false);
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if ((await sharedRateLimited(db, "site-enquiry-ip", ip, 5, 600)) || (await sharedRateLimited(db, "site-enquiry-site", live ? host : token, 20, 3600))) return back(false);

  const columns = "id, tenant_id, brief_id, status, content, website_briefs(email, business_name, name)";
  let found: unknown = null;
  if (live) {
    const site = await loadLiveSite(db, host);
    if (site) found = (await db.from("website_site_builds").select(columns).eq("id", site.buildId).maybeSingle()).data;
  } else {
    found = (await db.from("website_site_builds").select(columns).eq("access_token", token).maybeSingle()).data;
  }
  const row = found as unknown as Row | null;
  if (!row || row.status !== "released" || !row.website_briefs?.email) return new NextResponse(null, { status: 404 });

  const fields = Object.fromEntries([...form.entries()].filter(([, value]) => typeof value === "string"));
  const parsed = parseSiteEnquiry(fields);
  // A bot is told it worked, and nothing is sent.
  if (!parsed.ok) return back(Boolean(parsed.spam));
  const service = matchService(parsed.enquiry.service, serviceChoices(row.content));
  const enquiry = { ...parsed.enquiry, service };
  const photo = await readPhoto(form.get("photo"));
  const { name, contact, message } = enquiry;
  const storedMessage = [service ? `Service: ${service}` : "", message].filter(Boolean).join("\n\n");

  // Save first. If the table isn't there yet or the write fails, the email still goes, so nothing is lost either way.
  // The photo itself is only emailed: the table keeps a note that one was attached, not the file.
  const { data: lead, error: saveError } = await db
    .from("site_enquiries")
    .insert({ tenant_id: row.tenant_id, brief_id: row.brief_id, build_id: row.id, page, name, contact, message: photo.note ? `${storedMessage}${storedMessage ? "\n\n" : ""}${photo.note}` : storedMessage })
    .select("id")
    .maybeSingle();
  if (saveError) console.error("site-enquiry: could not save the request", saveError.message);

  const config = notificationMailConfig();
  const businessName = row.content?.business?.name || row.website_briefs.business_name || row.website_briefs.name;
  const email = siteEnquiryEmail({ businessName, enquiry, photo: photo.status });
  const sent = config ? await sendEmail(config, { to: row.website_briefs.email, subject: email.subject, text: email.text, replyTo: email.replyTo, ...(photo.file ? { attachments: [photo.file] } : {}) }, "Enquiry") : false;
  if (!sent) console.error("site-enquiry: the owner was not emailed", { saved: Boolean(lead) });
  if (lead && sent) await db.from("site_enquiries").update({ email_sent: true }).eq("id", (lead as { id: string }).id);

  return back(sent);
}
