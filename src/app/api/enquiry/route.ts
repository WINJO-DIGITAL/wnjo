import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { BUDGETS, LIMITS, MIN_FILL_MS, TIMELINES, TOPICS, clean, validateEnquiry } from "@/lib/enquiry";
import { mailConfig, notificationMailConfig, sendEmail, sendEnquiryEmail } from "@/lib/mailer";
import { issueInstantQuote } from "@/lib/instant-quote";
import { quoteEmail } from "@/lib/quote-email";
import { enquiryStoreConfigured, saveEnquiry } from "@/lib/enquiry-store";
import { formatBrief } from "@/lib/brief";
import { PROJECT_TYPES, estimate, parseAnswers } from "@/lib/pricing";
import { rateLimited } from "@/lib/rate-limit";
import { LIMITS_PER_ROUTE, sharedRateLimited } from "@/lib/rate-limit-shared";
import { serviceClient } from "@/lib/quote-store";
import { INTENTS, cleanDetails, formatDetails, validateDetails, type Intent } from "@/lib/website-enquiry";
import { customerAcknowledgement, ownerSubject } from "@/lib/website-emails";
import { ROUTED_WANTS, formatWebsiteQuote, parseWebsiteAnswers, websiteQuote } from "@/lib/website-quote";
import { formatGBP } from "@/lib/pricing";

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

  // The website calculator (/build) sends its own shape: answers, details and what to do next.
  if (body.kind === "website" && !fromForm) return handleWebsiteQuote(body, request);

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
  const shared = LIMITS_PER_ROUTE.enquiry;
  if (rateLimited(ip) || (await sharedRateLimited(serviceClient(), "enquiry", ip, shared.max, shared.windowSeconds))) {
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

  // A price brief gets its written quote straight away, by email and in the customer's account. Any failure here
  // leaves the enquiry as it is: the team still has it and can quote by hand.
  let quoteReference: string | undefined;
  if (kind === "brief" && saved && briefAnswers) {
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
          const site = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://winjodigital.co.uk";
          const email = quoteEmail({ name: fields.name, quoteReference, low: range.low, high: range.high, siteUrl: site });
          await sendEmail(config, { to: fields.email, subject: email.subject, text: email.text }, "Quote");
        }
      }
    } catch (error) {
      console.error("Instant quote failed:", error instanceof Error ? error.message.slice(0, 120) : "unknown error");
    }
  }
  return reply(200, { ok: true, reference, quoteReference });
}

/**
 * A quote from the website calculator. The price is recalculated here from the submitted answers; the browser's
 * figures are never trusted. Saved as a brief (with the answers and the recalculated figures), emailed to the
 * owner, and acknowledged to the customer. Success is returned only if it was saved or delivered.
 */
async function handleWebsiteQuote(body: Json, request: NextRequest) {
  const intent: Intent = typeof body.intent === "string" && body.intent in INTENTS ? (body.intent as Intent) : "quote";
  if (intent === "consultation") {
    return NextResponse.json(
      { error: "Online booking isn't available yet. Please request a callback instead.", code: "calendar_unavailable" },
      { status: 422 },
    );
  }
  const answers = parseWebsiteAnswers(body.answers);
  if (!answers || ROUTED_WANTS[answers.want]) {
    return NextResponse.json({ error: "Some of your choices were missing. Please review your quote." }, { status: 422 });
  }
  const details = cleanDetails(body.details);
  const fieldErrors = validateDetails(details, intent);
  if (Object.keys(fieldErrors).length) {
    return NextResponse.json({ error: "Please check the highlighted fields.", fields: fieldErrors }, { status: 422 });
  }

  const config = mailConfig();
  const storeOn = enquiryStoreConfigured();
  if (!config && !storeOn) {
    return NextResponse.json(
      { error: "Online enquiries aren't connected yet, so this quote has not been sent.", code: "not_configured" },
      { status: 503 },
    );
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const shared = LIMITS_PER_ROUTE.enquiry;
  if (rateLimited(ip) || (await sharedRateLimited(serviceClient(), "enquiry", ip, shared.max, shared.windowSeconds))) {
    return NextResponse.json(
      { error: "Too many submissions from this connection. Please try again in a few minutes." },
      { status: 429 },
    );
  }

  const quote = websiteQuote(answers);
  const reference = newReference();
  const subject = ownerSubject(details, quote, intent, reference);
  const text = [
    `Reference: ${reference}`,
    `Next step requested: ${INTENTS[intent].label}`,
    "",
    formatDetails(details),
    "",
    formatWebsiteQuote(answers, quote, formatGBP),
  ].join("\n");

  const saved = storeOn
    ? await saveEnquiry({
        reference,
        kind: "brief",
        name: details.name,
        email: details.email,
        company: details.businessName,
        topic: intent === "callback" ? "Callback request" : "Website quote",
        subject,
        body: text,
        answers: {
          type: "website",
          version: 1,
          intent,
          answers,
          details: { phone: details.phone, industry: details.industry, launchDate: details.launchDate },
          figures: {
            mode: quote.mode,
            package: quote.packageName,
            setup: quote.setup,
            monthly: quote.monthly,
            oneOffTotal: quote.oneOffTotal,
            initialPayment: quote.initialPayment,
            requiresQuote: quote.requiresQuote,
          },
        },
      })
    : false;
  const sent = config ? await sendEnquiryEmail(config, { subject, text, replyTo: details.email }) : false;

  if (!saved && !sent) {
    return NextResponse.json({ error: "We couldn't send your quote just now. Please try again shortly." }, { status: 502 });
  }

  // The customer's copy. A failure here doesn't undo the enquiry: we already have it.
  const customerConfig = notificationMailConfig();
  if (customerConfig) {
    const site = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://winjodigital.co.uk";
    const ack = customerAcknowledgement({ reference, details, quote, intent, siteUrl: site });
    await sendEmail(customerConfig, { to: details.email, subject: ack.subject, text: ack.text }, "Quote acknowledgement");
  }

  return NextResponse.json({ ok: true, reference });
}

