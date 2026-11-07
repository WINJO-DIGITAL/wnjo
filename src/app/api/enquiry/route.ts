import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { BUDGETS, LIMITS, MIN_FILL_MS, TIMELINES, TOPICS, clean, validateEnquiry } from "@/lib/enquiry";
import { mailConfig, notificationMailConfig, sendEmail, sendEnquiryEmail } from "@/lib/mailer";
import { issueInstantQuote } from "@/lib/instant-quote";
import { callbackPromise, quoteEmail } from "@/lib/callback";
import { enquiryStoreConfigured, saveEnquiry } from "@/lib/enquiry-store";
import { formatBrief } from "@/lib/brief";
import { PROJECT_TYPES, estimate, parseAnswers } from "@/lib/pricing";
import { rateLimited } from "@/lib/rate-limit";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 32 * 1024;

type Json = Record<string, unknown>;

/** A short reference quoted to the customer and in the email subject, so follow-up can be matched up. */
const newReference = () => `WNJO-${randomBytes(3).toString("hex").toUpperCase()}`;

export async function POST(request: NextRequest) {
  // The plain-HTML form (for visitors without JavaScript) posts form fields and gets a page back; the normal form
  // posts JSON and gets JSON back. Both go through the same checks below.
  const fromForm = (request.headers.get("content-type") ?? "").includes("application/x-www-form-urlencoded");
  const reply = (status: number, json: Json) => {
    if (!fromForm) return NextResponse.json(json, { status });
    const target =
      status === 200
        ? `/contact/sent${typeof json.reference === "string" ? `?ref=${encodeURIComponent(json.reference)}` : ""}`
        : `/contact/not-sent?status=${status}`;
    return NextResponse.redirect(new URL(target, request.url), 303);
  };

  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_BODY_BYTES) return reply(413, { error: "That submission is too large." });

  let body: Json;
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) return reply(413, { error: "That submission is too large." });
    if (fromForm) {
      body = Object.fromEntries(new URLSearchParams(raw));
    } else {
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("not an object");
      body = parsed as Json;
    }
  } catch {
    return reply(400, { error: "We couldn't read that submission. Please try again." });
  }

  // Spam signals: a hidden field humans never fill, and implausibly fast completion.
  // Respond as if accepted so automated senders learn nothing.
  const startedAt = Number(body.startedAt);
  if (clean(body.website, 200) !== "" || !Number.isFinite(startedAt) || Date.now() - startedAt < MIN_FILL_MS) {
    return reply(200, { ok: true });
  }

  const kind = body.kind === "brief" ? "brief" : "contact";
  // Budget and timeline help, but are optional everywhere, so nobody is stopped for not knowing yet.
  const result = validateEnquiry(body, { messageRequired: kind === "contact", detailsRequired: false });
  if (!result.ok) return reply(422, { error: "Please check the highlighted fields.", fields: result.errors });
  const fields = result.data;

  const lines: string[] = [
    `Name: ${fields.name}`,
    `Email: ${fields.email}`,
    ...(fields.company ? [`Company: ${fields.company}`] : []),
    `Project type: ${TOPICS[fields.topic]}`,
    ...(fields.budget ? [`Budget: ${BUDGETS[fields.budget]}`] : []),
    ...(fields.timeline ? [`Timeline: ${TIMELINES[fields.timeline]}`] : []),
    "",
  ];
  let subject = `Enquiry from ${fields.name}: ${TOPICS[fields.topic]}`;

  let briefAnswers: ReturnType<typeof parseAnswers> = null;
  if (kind === "brief") {
    const answers = parseAnswers(body.answers);
    if (!answers) return reply(422, { error: "Some project answers were missing. Please review your brief." });
    briefAnswers = answers;
    // The brief (including the estimate) is recalculated here; the browser's figure is never trusted.
    const details = {
      business: clean(body.business, LIMITS.message),
      goals: clean(body.goals, LIMITS.message),
      launchDate: clean(body.launchDate, LIMITS.launchDate),
    };
    subject = `Project brief from ${fields.name}: ${PROJECT_TYPES[answers.projectType].label}`;
    lines.push(formatBrief(answers, details), "");
  }

  if (fields.message) lines.push(kind === "brief" ? "ADDITIONAL NOTES" : "GOALS", fields.message);

  const config = mailConfig();
  const storeOn = enquiryStoreConfigured();
  if (!config && !storeOn) {
    return reply(503, {
      error: "Online enquiries aren't connected yet, so this message has not been sent.",
      code: "not_configured",
    });
  }

  // Only deliverable submissions count towards the limit, so correcting a form never locks anyone out.
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (rateLimited(ip)) {
    return reply(429, { error: "Too many submissions from this connection. Please try again in a few minutes." });
  }

  // Keep the enquiry first, so it survives even if the email step fails. Then email it if that's set up.
  const reference = newReference();
  const emailSubject = `${subject.replace(/\s+/g, " ").slice(0, 180)} [${reference}]`;
  const text = [`Reference: ${reference}`, ...lines].join("\n");
  const saved = storeOn
    ? await saveEnquiry({
        reference,
        kind,
        name: fields.name,
        email: fields.email,
        company: fields.company || undefined,
        topic: TOPICS[fields.topic],
        budget: fields.budget ? BUDGETS[fields.budget] : undefined,
        timeline: fields.timeline ? TIMELINES[fields.timeline] : undefined,
        subject: emailSubject,
        body: text,
        answers: kind === "brief" ? briefAnswers : undefined,
      })
    : false;
  const sent = config
    ? await sendEnquiryEmail(config, { subject: emailSubject, text, replyTo: fields.email })
    : false;

  if (!saved && !sent) {
    return reply(502, { error: "We couldn't send your message just now. Please try again shortly." });
  }

  // A price brief gets its written quote straight away, by email and in the customer's account, plus a call-back
  // promise. Any failure here leaves the enquiry as it is: the team still has it and can quote by hand.
  let quoteReference: string | undefined;
  let callback: string | undefined;
  if (kind === "brief" && saved && briefAnswers) {
    callback = callbackPromise(new Date());
    try {
      const quote = await issueInstantQuote({
        enquiryReference: reference,
        name: fields.name,
        email: fields.email,
        company: fields.company || undefined,
        answers: briefAnswers,
      });
      if (quote) {
        quoteReference = quote.quoteReference;
        const config = notificationMailConfig();
        if (config) {
          const range = estimate(briefAnswers).range;
          const site = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://www.wnjoweb.co.uk";
          const email = quoteEmail({ name: fields.name, quoteReference, low: range.low, high: range.high, siteUrl: site, callback });
          await sendEmail(config, { to: fields.email, subject: email.subject, text: email.text }, "Quote");
        }
      }
    } catch (error) {
      console.error("Instant quote failed:", error instanceof Error ? error.message.slice(0, 120) : "unknown error");
    }
  }
  return reply(200, { ok: true, reference, quoteReference, callback });
}
