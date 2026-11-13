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
import { customerAcknowledgement, hostingAcknowledgement, ownerSubject, payLinkEmail, projectAcknowledgement } from "@/lib/website-emails";
import { startQuotePayment } from "@/lib/pay-from-quote";
import { routeFor } from "@/lib/build-journey";
import { payNowFor } from "@/lib/pay-now";
import { CARE_PLANS, OWNERSHIP } from "@/lib/pricing";
import { ROUTED_WANTS, formatWebsiteQuote, parseWebsiteAnswers, websiteQuote } from "@/lib/website-quote";
import { formatGBP } from "@/lib/pricing";
import { confirmBriefFiles, createBrief } from "@/lib/brief-store";
import { WNJO_TENANT_ID } from "@/lib/enquiry-store";
import { cleanProjectRequest } from "@/lib/project-request";
import { WEBSITE_STATUS, cleanHostingRequest } from "@/lib/hosting-request";
import { DRAFT_ID_RE, cleanBrief, formatBrief as formatWebsiteBrief, validateBrief } from "@/lib/website-brief";

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
  // The buy-outright request (/build/project): a short brief that goes to a written proposal.
  if (body.kind === "project" && !fromForm) return handleProjectRequest(body, request);
  // The hosting-only request (/build/hosting): a plan and where their website is up to, then a payment link from us.
  if (body.kind === "hosting" && !fromForm) return handleHostingRequest(body, request);

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
 * A buy-outright request: name, business and email, what the site is for, a budget and a deadline. Saved as a tracked
 * brief on the proposal route, so staff write the proposal and the customer pays the 50% deposit after accepting it.
 * Nothing is charged here.
 */
async function handleProjectRequest(body: Json, request: NextRequest) {
  const parsed = cleanProjectRequest(body);
  if (!parsed.ok) return NextResponse.json({ error: "Please check the highlighted fields.", fields: parsed.errors }, { status: 422 });
  const { details, answers, brief, quote, budget, timeline } = parsed.value;

  const config = mailConfig();
  const storeOn = enquiryStoreConfigured();
  if (!config && !storeOn) {
    return NextResponse.json({ error: "Online enquiries aren't connected yet, so this request has not been sent.", code: "not_configured" }, { status: 503 });
  }
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const shared = LIMITS_PER_ROUTE.enquiry;
  if (rateLimited(ip) || (await sharedRateLimited(serviceClient(), "enquiry", ip, shared.max, shared.windowSeconds))) {
    return NextResponse.json({ error: "Too many submissions from this connection. Please try again in a few minutes." }, { status: 429 });
  }

  const reference = newReference();
  const subject = `Website project request from ${details.businessName || details.name} [${reference}]`;
  const text = [
    `Reference: ${reference}`,
    "Route: buy outright (written proposal, then 50% deposit)",
    ...(budget ? [`Budget: ${BUDGETS[budget]}`] : []),
    ...(timeline ? [`Wanted by: ${TIMELINES[timeline]}`] : []),
    "They have only said who they are so far. They now fill in their goals, pages and style in their account, then it's ready to quote.",
    "",
    formatDetails(details),
    "",
    formatWebsiteBrief(brief),
  ];
  const db = serviceClient();
  const saved = storeOn
    ? await saveEnquiry({
        reference,
        kind: "brief",
        name: details.name,
        email: details.email,
        company: details.businessName,
        topic: "Website project request",
        subject,
        body: text.join("\n"),
        answers: { type: "website", version: 1, intent: "quote", answers, details: { phone: details.phone, industry: details.industry, launchDate: details.launchDate }, figures: { mode: quote.mode, package: quote.packageName, setup: quote.setup, monthly: quote.monthly, oneOffTotal: quote.oneOffTotal, initialPayment: quote.initialPayment, requiresQuote: true } },
      })
    : false;
  const sent = config ? await sendEnquiryEmail(config, { subject, text: text.join("\n"), replyTo: details.email }) : false;
  if (!saved && !sent) {
    return NextResponse.json({ error: "We couldn't send your request just now. Please try again shortly." }, { status: 502 });
  }

  const created =
    saved && db
      ? await createBrief(db, { tenantId: WNJO_TENANT_ID, reference, email: details.email, name: details.name, businessName: details.businessName, draftId: null, brief, answers, quote })
      : null;

  const customerConfig = notificationMailConfig();
  if (customerConfig) {
    const site = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://winjodigital.co.uk";
    const ack = projectAcknowledgement({ reference, details, siteUrl: site });
    await sendEmail(customerConfig, { to: details.email, subject: ack.subject, text: ack.text }, "Project request acknowledgement");
  }
  return NextResponse.json({ ok: true, reference, route: created?.route ?? null, tracked: Boolean(created), pay: null, paymentStarted: false });
}

/**
 * A request for hosting on its own. Saved as an enquiry (so it shows in Admin and survives an email failure), emailed to
 * the owner, and acknowledged to the customer. The plan and its price come from the one price list here, never the browser.
 */
async function handleHostingRequest(body: Json, request: NextRequest) {
  const parsed = cleanHostingRequest(body);
  if (!parsed.ok) return NextResponse.json({ error: "Please check the highlighted fields.", fields: parsed.errors }, { status: 422 });
  const { plan, status, details } = parsed.value;

  const config = mailConfig();
  const storeOn = enquiryStoreConfigured();
  if (!config && !storeOn) {
    return NextResponse.json({ error: "Online enquiries aren't connected yet, so this request has not been sent.", code: "not_configured" }, { status: 503 });
  }
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const shared = LIMITS_PER_ROUTE.enquiry;
  if (rateLimited(ip) || (await sharedRateLimited(serviceClient(), "enquiry", ip, shared.max, shared.windowSeconds))) {
    return NextResponse.json({ error: "Too many submissions from this connection. Please try again in a few minutes." }, { status: 429 });
  }

  const reference = newReference();
  const subject = `Hosting request from ${details.businessName || details.name} [${reference}]`;
  const text = [
    `Reference: ${reference}`,
    "Route: hosting only (send them a secure payment link to start the plan)",
    `Plan: ${CARE_PLANS[plan].label}, ${formatGBP(CARE_PLANS[plan].monthly)} a month`,
    `Their website: ${WEBSITE_STATUS[status]}`,
    ...(status === "need" ? ["They were shown a bespoke website from £999 and a managed plan from £99 a month, and chose to continue with hosting."] : []),
    "",
    `Name: ${details.name}`,
    `Business: ${details.businessName}`,
    `Email: ${details.email}`,
    ...(details.phone ? [`Phone: ${details.phone}`] : []),
    ...(details.existingWebsite ? [`Website address: ${details.existingWebsite}`] : []),
  ].join("\n");
  const saved = storeOn
    ? await saveEnquiry({ reference, kind: "contact", name: details.name, email: details.email, company: details.businessName, topic: "Hosting request", subject, body: text })
    : false;
  const sent = config ? await sendEnquiryEmail(config, { subject, text, replyTo: details.email }) : false;
  if (!saved && !sent) {
    return NextResponse.json({ error: "We couldn't send your request just now. Please try again shortly." }, { status: 502 });
  }

  const customerConfig = notificationMailConfig();
  if (customerConfig) {
    const site = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://winjodigital.co.uk";
    const ack = hostingAcknowledgement({ reference, details, plan, status, siteUrl: site });
    await sendEmail(customerConfig, { to: details.email, subject: ack.subject, text: ack.text }, "Hosting request acknowledgement");
  }
  return NextResponse.json({ ok: true, reference, route: null, tracked: false, pay: null, paymentStarted: false });
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
  // Paying straight from the quote needs the customer's agreement to the terms first, checked here as well as in the form.
  if (intent === "pay" && body.agree !== true) {
    return NextResponse.json({ error: "Please agree to the terms before you pay." }, { status: 422 });
  }
  const answers = parseWebsiteAnswers(body.answers);
  if (!answers || ROUTED_WANTS[answers.want]) {
    return NextResponse.json({ error: "Some of your choices were missing. Please review your quote." }, { status: 422 });
  }
  const details = cleanDetails(body.details);
  // The short plan checkout: a monthly plan paid for straight away, with the brief collected afterwards.
  const short = body.short === true;
  if (short && (intent !== "pay" || answers.mode !== "monthly")) {
    return NextResponse.json({ error: "Some of your choices were missing. Please review your plan." }, { status: 422 });
  }
  const fieldErrors = validateDetails(details, intent, short);
  if (Object.keys(fieldErrors).length) {
    return NextResponse.json({ error: "Please check the highlighted fields.", fields: fieldErrors }, { status: 422 });
  }
  // The brief (goals, pages, design, files). Older pages without it still send a quote.
  const draftId = typeof body.draftId === "string" && DRAFT_ID_RE.test(body.draftId) ? body.draftId : null;
  const hasBrief = !short && body.brief !== undefined && body.brief !== null;
  let brief = cleanBrief(short ? undefined : body.brief, draftId ?? undefined);
  if (hasBrief) {
    const briefErrors = validateBrief(brief);
    if (Object.keys(briefErrors).length) {
      return NextResponse.json({ error: "Please complete your brief.", brief: briefErrors }, { status: 422 });
    }
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
  // A short checkout must be payable on the spot; anything that needs a written proposal goes through the full steps.
  if (short && !payNowFor(routeFor(quote), quote)) {
    return NextResponse.json({ error: "That plan needs a written proposal first. Please use the full steps." }, { status: 422 });
  }
  const reference = newReference();
  const subject = ownerSubject(details, quote, intent, reference);
  const text = [
    `Reference: ${reference}`,
    `Next step requested: ${INTENTS[intent].label}`,
    "",
    formatDetails(details),
    "",
    formatWebsiteQuote(answers, quote, formatGBP),
  ];
  const db = serviceClient();
  if (hasBrief && db && draftId) brief = await confirmBriefFiles(db, draftId, brief);
  if (hasBrief) text.push("", formatWebsiteBrief(brief));

  const saved = storeOn
    ? await saveEnquiry({
        reference,
        kind: "brief",
        name: details.name,
        email: details.email,
        company: details.businessName,
        topic: intent === "callback" ? "Callback request" : "Website quote",
        subject,
        body: text.join("\n"),
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
  const notifyOwner = async () =>
    config ? await sendEnquiryEmail(config, { subject, text: text.join("\n"), replyTo: details.email }) : false;
  // Someone about to pay isn't a customer until the money lands, so staff are told then (the Stripe webhook sends
  // "New subscription" / "payment received"), not when the form is submitted. The request is still saved and shows
  // in the admin. If the payment can't be started, staff are emailed below instead, so it is never lost.
  const holdForPayment = intent === "pay" && saved && Boolean(db);
  const sent = holdForPayment ? false : await notifyOwner();

  if (!saved && !sent) {
    return NextResponse.json({ error: "We couldn't send your quote just now. Please try again shortly." }, { status: 502 });
  }

  // The tracked brief: what the customer follows in their account and staff approve stage by stage.
  const created =
    (hasBrief || short) && saved && db
      ? await createBrief(db, {
          tenantId: WNJO_TENANT_ID,
          reference,
          email: details.email,
          name: details.name,
          businessName: details.businessName,
          draftId,
          brief,
          answers,
          quote,
        })
      : null;

  // Paying straight from the quote: a standard package, or a one-off at or under the proposal threshold. A bespoke
  // build never pays here; it goes through a written proposal first. If anything fails, the brief is still saved.
  const payment =
    intent === "pay" && created && db
      ? await startQuotePayment(db, {
          origin: new URL(request.url).origin,
          tenantId: WNJO_TENANT_ID,
          reference,
          route: created.route,
          email: details.email,
          name: details.name,
          businessName: details.businessName || null,
          answers,
          quote,
          startNow: body.startNow === true,
        })
      : null;
  // No payment started (it failed, or the brief couldn't be tracked): tell staff now so the request isn't missed.
  if (holdForPayment && !payment) await notifyOwner();

  // The customer's copy. A failure here doesn't undo the enquiry: we already have it.
  const customerConfig = notificationMailConfig();
  if (customerConfig) {
    const site = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://winjodigital.co.uk";
    if (payment) {
      // Only when Stripe's page couldn't be opened: then the page tells them a link is on its way. A customer who is
      // taken to Stripe is paying right now, so a "you didn't finish" email would be wrong for most of them. If they
      // close the page, Stripe's cancel link brings them back to the same offer.
      if (!payment.url) {
        const { amounts, reference: offerReference, token } = payment.offer;
        const message = payLinkEmail(
          {
            reference: offerReference,
            name: details.name,
            packageName: amounts.packageName,
            kind: amounts.kind,
            setupPence: amounts.setupPence,
            monthlyPence: amounts.monthlyPence,
            oneOffPence: amounts.oneOffPence,
            ownershipAfterPayments: OWNERSHIP.ownershipAfterPayments,
            minimumTermMonths: OWNERSHIP.minimumTermMonths,
          },
          `${new URL(request.url).origin}/subscribe/${token}`,
        );
        await sendEmail(customerConfig, { to: details.email, subject: message.subject, text: message.text }, "Payment link");
      }
    } else {
      const ack = customerAcknowledgement({ reference, details: details, quote, intent: intent === "pay" ? "quote" : intent, siteUrl: site });
      await sendEmail(customerConfig, { to: details.email, subject: ack.subject, text: ack.text }, "Quote acknowledgement");
    }
  }

  return NextResponse.json({
    ok: true,
    reference,
    route: created?.route ?? null,
    tracked: Boolean(created),
    // Where to send the customer to pay, or null when they should wait for an email instead.
    pay: payment?.url ? { url: payment.url } : null,
    paymentStarted: Boolean(payment),
  });
}

