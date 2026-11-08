"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { LegalDraftNotice } from "@/components/pricing/WebsitePackages";
import {
  ADD_ONS,
  CARE_PLANS,
  EXTRA_PAGE,
  ONE_OFF_WEBSITE,
  OWNERSHIP,
  VAT_NOTE,
  WEBSITE_PAGE_BANDS,
  WEBSITE_PLANS,
  formatGBP,
  type AddOnId,
  type CarePlan,
  type WebsitePageBand,
  type WebsitePlanId,
} from "@/lib/pricing";
import {
  DETAIL_LIMITS,
  EMPTY_DETAILS,
  INTENTS,
  cleanDetails,
  validateDetails,
  type DetailErrors,
  type Intent,
  type WebsiteDetails,
} from "@/lib/website-enquiry";
import {
  COPY_STATES,
  DEFAULT_WEBSITE_ANSWERS,
  ROUTED_WANTS,
  WANTS,
  YES_NO,
  parseWebsiteAnswers,
  websiteQuote,
  type ContentAnswers,
  type QuoteLine,
  type Want,
  type WebsiteAnswers,
  type WebsiteQuote,
} from "@/lib/website-quote";
import { ArrowLeft, ArrowRight } from "../Icons";
import { useEnquirySubmit } from "../useEnquirySubmit";
import styles from "./Configurator.module.css";

const STORAGE_KEY = "wnjo.website-quote.v1";

const STEPS = [
  { id: "want", label: "Start", title: "What would you like?" },
  { id: "package", label: "Package", title: "Choose your package." },
  { id: "pages", label: "Pages", title: "How many pages?" },
  { id: "features", label: "Features", title: "What should your website do?" },
  { id: "content", label: "Content", title: "Design and content." },
  { id: "details", label: "Business", title: "About your business." },
  { id: "summary", label: "Quote", title: "Your quote." },
  { id: "next", label: "Next step", title: "How would you like to continue?" },
] as const;
type StepId = (typeof STEPS)[number]["id"];
const stepIndexOf = (id: StepId) => STEPS.findIndex((s) => s.id === id);

const PLAN_ORDER: WebsitePlanId[] = ["bronze", "silver", "gold"];
const ADD_ON_ORDER = Object.keys(ADD_ONS) as AddOnId[];
const CARE_ORDER: CarePlan[] = ["none", "hosting", "care", "carePlus"];

const CONTENT_QUESTIONS: { key: keyof ContentAnswers; legend: string }[] = [
  { key: "logo", legend: "Do you have a logo?" },
  { key: "colours", legend: "Do you have brand colours?" },
  { key: "photos", legend: "Do you have professional photography?" },
  { key: "existingSite", legend: "Do you have an existing website?" },
  { key: "needCopywriting", legend: "Would you like us to write the copy?" },
  { key: "needBranding", legend: "Would you like help with branding?" },
];

/** Choices carried in the link: ?plan=silver from a package card, ?type=oneOff, ?care=hosting, ?business=Café. */
export type WebsiteConfiguratorParams = { plan?: string; type?: string; care?: string; pages?: string; business?: string };

type Saved = { answers: WebsiteAnswers; details: WebsiteDetails };

function loadSaved(): Saved | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as { answers?: unknown; details?: unknown };
    const answers = parseWebsiteAnswers(data.answers);
    return answers ? { answers, details: cleanDetails(data.details) } : null;
  } catch {
    return null;
  }
}

function store(saved: Saved | null) {
  try {
    if (saved) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* Storage unavailable (private mode, blocked). The calculator still works. */
  }
}

function initialState(params: WebsiteConfiguratorParams, withSaved: boolean): Saved {
  const saved = (withSaved ? loadSaved() : null) ?? { answers: DEFAULT_WEBSITE_ANSWERS, details: EMPTY_DETAILS };
  const answers = { ...saved.answers };
  if (params.plan && params.plan in WEBSITE_PLANS) {
    Object.assign(answers, { plan: params.plan as WebsitePlanId, mode: "monthly", want: "monthly" });
  }
  if (params.type === "oneOff") Object.assign(answers, { mode: "oneOff", want: "oneOff" });
  if (params.care && params.care in CARE_PLANS && params.care !== "none") {
    Object.assign(answers, { mode: "oneOff", want: "oneOff", care: params.care as CarePlan });
  }
  if (params.pages && params.pages in WEBSITE_PAGE_BANDS) answers.pages = params.pages as WebsitePageBand;
  const business = params.business?.trim().slice(0, DETAIL_LIMITS.industry);
  const details = business && !saved.details.industry ? { ...saved.details, industry: business } : saved.details;
  return { answers, details };
}

const noopSubscribe = () => () => {};

/**
 * The server renders the first step with the link's choices; once hydrated, the calculator remounts with any saved
 * progress from this browser. Both start on the same step, so nothing moves.
 */
export function WebsiteConfigurator({
  params,
  calendarEnabled = false,
}: {
  params: WebsiteConfiguratorParams;
  calendarEnabled?: boolean;
}) {
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);
  return (
    <Inner
      key={hydrated ? "browser" : "server"}
      params={params}
      inBrowser={hydrated}
      calendarEnabled={calendarEnabled}
    />
  );
}

function Inner({
  params,
  inBrowser,
  calendarEnabled,
}: {
  params: WebsiteConfiguratorParams;
  inBrowser: boolean;
  calendarEnabled: boolean;
}) {
  const [init] = useState(() => initialState(params, inBrowser));
  const [answers, setAnswers] = useState<WebsiteAnswers>(init.answers);
  const [details, setDetails] = useState<WebsiteDetails>(init.details);
  const [detailErrors, setDetailErrors] = useState<DetailErrors>({});
  const [intent, setIntent] = useState<Intent>("quote");
  const [honeypot, setHoneypot] = useState("");
  const [stepIndex, setStepIndex] = useState(0);
  const [furthest, setFurthest] = useState(0);
  const [startedAt] = useState(() => Date.now());
  const [sheetOpen, setSheetOpen] = useState(false);
  const { state, submit } = useEnquirySubmit();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  const quote = useMemo(() => websiteQuote(answers), [answers]);
  const step = STEPS[stepIndex];
  const routed = ROUTED_WANTS[answers.want];
  const monthly = answers.mode === "monthly";
  const plan = WEBSITE_PLANS[answers.plan];
  const includedHere = new Set<AddOnId>(monthly ? plan.includedAddOns : ONE_OFF_WEBSITE.includedAddOns);

  useEffect(() => {
    if (!inBrowser) return;
    store(state.status === "success" ? null : { answers, details });
  }, [answers, details, state.status, inBrowser]);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus({ preventScroll: true });
    headingRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [stepIndex]);

  const set = <K extends keyof WebsiteAnswers>(key: K, value: WebsiteAnswers[K]) =>
    setAnswers((a) => ({ ...a, [key]: value }));
  const setContent = <K extends keyof ContentAnswers>(key: K, value: ContentAnswers[K]) =>
    setAnswers((a) => ({ ...a, content: { ...a.content, [key]: value } }));
  const setDetail = (key: keyof WebsiteDetails, value: string) => {
    setDetails((d) => ({ ...d, [key]: value }));
    if (detailErrors[key]) setDetailErrors((e) => ({ ...e, [key]: undefined }));
  };

  const goTo = (index: number) => {
    setStepIndex(index);
    setFurthest((f) => Math.max(f, index));
  };
  const goToId = (id: StepId) => goTo(stepIndexOf(id));

  const chooseWant = (want: Want) =>
    setAnswers((a) => ({ ...a, want, mode: want === "oneOff" ? "oneOff" : want === "monthly" || want === "unsure" ? "monthly" : a.mode }));

  const toggleAddOn = (id: AddOnId) =>
    set("addOns", answers.addOns.includes(id) ? answers.addOns.filter((x) => x !== id) : [...answers.addOns, id]);

  const next = () => {
    if (step.id === "details") {
      const errors = validateDetails(cleanDetails(details), "quote");
      setDetailErrors(errors);
      if (Object.keys(errors).length) return;
    }
    goTo(stepIndex + 1);
  };

  const onSend = async (event: React.FormEvent) => {
    event.preventDefault();
    const cleaned = cleanDetails(details);
    const errors = validateDetails(cleaned, intent);
    if (Object.keys(errors).length) {
      setDetailErrors(errors);
      if (!(intent === "callback" && Object.keys(errors).length === 1 && errors.phone)) goToId("details");
      return;
    }
    const result = await submit({ kind: "website", intent, answers, details: cleaned, website: honeypot, startedAt });
    // A server-side check of the business details sends the visitor back to that step, with the messages shown.
    if (result?.status === "error" && result.fields && Object.keys(result.fields).length) {
      setDetailErrors(result.fields as DetailErrors);
      goToId("details");
    }
  };

  if (state.status === "success") {
    return (
      <div className={styles.done}>
        <div className="card card--raised stack" style={{ "--stack": "var(--space-5)" } as React.CSSProperties}>
          <p className="eyebrow">{intent === "callback" ? "Callback requested" : "Quote received"}</p>
          <h2 className="h2" tabIndex={-1} ref={(el) => el?.focus()}>
            Thank you, {details.name.trim().split(/\s+/)[0]}. Your quote is with us.
          </h2>
          <p className="muted">
            Your reference is <strong>{state.reference}</strong>. A copy is on its way to <strong>{details.email}</strong>.{" "}
            {intent === "callback"
              ? `We'll call you on ${details.phone} within one working day.`
              : "We'll reply within one working day with a written proposal."}{" "}
            Nothing is charged until you accept it.
          </p>
          <QuoteBreakdown quote={quote} />
          <div className="btn-row">
            <Link href="/work" className="btn btn--secondary">
              See our work
            </Link>
            <Link href="/" className="btn btn--secondary">
              Back to home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const continueLabel =
    STEPS[stepIndex + 1]?.id === "summary" ? "See my quote" : STEPS[stepIndex + 1]?.id === "next" ? "Continue" : "Continue";

  return (
    <div className={styles.layout}>
      <div className={styles.main}>
        <nav aria-label="Quote progress" className={styles.progress}>
          <p className={styles.progressText}>
            Step {stepIndex + 1} of {STEPS.length}
            <span aria-hidden="true"> · {step.label}</span>
          </p>
          <div className={styles.bar} aria-hidden="true">
            <span style={{ width: `${((stepIndex + 1) / STEPS.length) * 100}%` }} />
          </div>
          <ol role="list" className={styles.steps}>
            {STEPS.map((s, i) => (
              <li key={s.id}>
                <button
                  type="button"
                  className={styles.stepBtn}
                  onClick={() => goTo(i)}
                  disabled={i > furthest || Boolean(routed && i > 0)}
                  aria-current={i === stepIndex ? "step" : undefined}
                >
                  <span className={styles.stepNum}>{i + 1}</span>
                  {s.label}
                </button>
              </li>
            ))}
          </ol>
        </nav>

        <section className={styles.panel} aria-labelledby="step-title">
          <h2 id="step-title" className="h2" ref={headingRef} tabIndex={-1}>
            {step.title}
          </h2>

          <div key={step.id} className={styles.body}>
            {step.id === "want" && (
              <>
                <ChoiceGroup
                  legend="What would you like?"
                  name="want"
                  options={WANTS}
                  value={answers.want}
                  onChange={chooseWant}
                  columns={2}
                />
                {routed && (
                  <div className="notice">
                    <span>
                      <strong>That&apos;s our {routed.service} service.</strong> It&apos;s scoped to your business rather
                      than priced from a website package, so tell us what you need and we&apos;ll come back with a
                      written proposal.{" "}
                      <Link href={routed.href} className="arrow-link">
                        Tell us about it <ArrowRight />
                      </Link>
                    </span>
                  </div>
                )}
              </>
            )}

            {step.id === "package" && (
              <>
                <ChoiceGroup
                  legend="How would you like to pay?"
                  name="mode"
                  options={{
                    monthly: { label: "Monthly package", hint: "Hosting, maintenance and support included." },
                    oneOff: { label: "One-off, paid up front", hint: `From ${formatGBP(ONE_OFF_WEBSITE.from)}.` },
                  }}
                  value={answers.mode}
                  onChange={(v) => setAnswers((a) => ({ ...a, mode: v, want: v === "oneOff" ? "oneOff" : a.want === "oneOff" ? "monthly" : a.want }))}
                  columns={2}
                />
                {monthly ? (
                  <fieldset className={styles.group}>
                    <legend className={styles.legend}>Package</legend>
                    <div className={styles.choices}>
                      {PLAN_ORDER.map((id) => {
                        const p = WEBSITE_PLANS[id];
                        return (
                          <label key={id} className={styles.choice}>
                            <input type="radio" name="plan" checked={answers.plan === id} onChange={() => set("plan", id)} />
                            <span className={styles.choiceBody}>
                              <span className={styles.choiceLabel}>
                                {p.name}
                                {p.popular && <span className="cfg-tag">Most popular</span>}
                              </span>
                              <span className={styles.choicePrice}>
                                {formatGBP(p.monthly)} a month + {formatGBP(p.setup)} setup
                              </span>
                              <span className={styles.choiceHint}>{p.summary}</span>
                              <ul className="cfg-includes" role="list">
                                {p.includes.map((item) => (
                                  <li key={item}>{item}</li>
                                ))}
                                <li>Ownership after {OWNERSHIP.ownershipAfterPayments} successful monthly payments</li>
                              </ul>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>
                ) : (
                  <div className={`${styles.choice} cfg-static`}>
                    <span className={styles.choiceBody}>
                      <span className={styles.choiceLabel}>{ONE_OFF_WEBSITE.name}</span>
                      <span className={styles.choicePrice}>From {formatGBP(ONE_OFF_WEBSITE.from)}, paid up front</span>
                      <span className={styles.choiceHint}>{ONE_OFF_WEBSITE.summary}</span>
                      <ul className="cfg-includes" role="list">
                        {ONE_OFF_WEBSITE.includes.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </span>
                  </div>
                )}
              </>
            )}

            {step.id === "pages" && (
              <ChoiceGroup
                legend="Number of pages"
                name="pages"
                hint={`${monthly ? plan.name : ONE_OFF_WEBSITE.name} includes up to ${quote.pagesIncluded} pages. Extra pages are ${monthly ? `${formatGBP(EXTRA_PAGE.monthly)} a month` : formatGBP(EXTRA_PAGE.oneOff)} each.`}
                options={Object.fromEntries(
                  (Object.keys(WEBSITE_PAGE_BANDS) as WebsitePageBand[]).map((band) => {
                    const max = WEBSITE_PAGE_BANDS[band].max;
                    const extra = max === null ? null : Math.max(0, max - quote.pagesIncluded);
                    const hint =
                      max === null
                        ? "Custom quote"
                        : extra === 0
                          ? "Included"
                          : monthly
                            ? `+${formatGBP(extra! * EXTRA_PAGE.monthly)} a month (${extra} extra)`
                            : `+${formatGBP(extra! * EXTRA_PAGE.oneOff)} (${extra} extra)`;
                    return [band, { label: WEBSITE_PAGE_BANDS[band].label, hint }];
                  }),
                ) as Record<WebsitePageBand, { label: string; hint: string }>}
                value={answers.pages}
                onChange={(v) => set("pages", v)}
                columns={2}
              />
            )}

            {step.id === "features" && (
              <>
                <fieldset className={styles.group}>
                  <legend className={styles.legend}>Choose any you need</legend>
                  <p className="field-hint">
                    Anything your package already includes is ticked and never charged twice.
                  </p>
                  <div className={`${styles.choices} ${styles.cols2}`}>
                    {ADD_ON_ORDER.map((id) => {
                      const a: (typeof ADD_ONS)[AddOnId] = ADD_ONS[id];
                      const included = includedHere.has(id);
                      return (
                        <label key={id} className={styles.choice}>
                          <input
                            type="checkbox"
                            checked={included || answers.addOns.includes(id)}
                            disabled={included}
                            onChange={() => toggleAddOn(id)}
                          />
                          <span className={styles.choiceBody}>
                            <span className={styles.choiceLabel}>{a.label}</span>
                            <span className={styles.choicePrice}>{addOnPrice(id, monthly, included)}</span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                  {quote.thirdParty.length > 0 && (
                    <ul className="cfg-notes" role="list">
                      {quote.thirdParty.map((t) => (
                        <li key={t}>{t}</li>
                      ))}
                    </ul>
                  )}
                </fieldset>
                {!monthly && (
                  <ChoiceGroup
                    legend="Hosting and care after launch (optional)"
                    name="care"
                    options={Object.fromEntries(
                      CARE_ORDER.map((id) => [
                        id,
                        {
                          label: id === "none" ? "I'll host it myself" : `${CARE_PLANS[id].label} · ${formatGBP(CARE_PLANS[id].monthly)} a month`,
                          hint: CARE_PLANS[id].summary,
                        },
                      ]),
                    ) as Record<CarePlan, { label: string; hint: string }>}
                    value={answers.care}
                    onChange={(v) => set("care", v)}
                    columns={2}
                  />
                )}
              </>
            )}

            {step.id === "content" && (
              <>
                <div className="cfg-yesno">
                  {CONTENT_QUESTIONS.map(({ key, legend }) => (
                    <ChoiceGroup
                      key={key}
                      legend={legend}
                      name={key}
                      options={YES_NO}
                      value={answers.content[key] as "yes" | "no"}
                      onChange={(v) => setContent(key, v as never)}
                      columns={2}
                      compact
                    />
                  ))}
                </div>
                <ChoiceGroup
                  legend="Do you have the words for your website?"
                  name="copy"
                  options={COPY_STATES}
                  value={answers.content.copy}
                  onChange={(v) => setContent("copy", v)}
                  columns={2}
                  compact
                />
                {(quote.notes.length > 0 || answers.content.needCopywriting === "yes" || answers.content.needBranding === "yes") && (
                  <ul className="cfg-notes" role="list">
                    {answers.content.needCopywriting === "yes" && <li>Copywriting is quoted once we know how many pages need writing.</li>}
                    {answers.content.needBranding === "yes" && <li>Branding help is quoted after a short conversation.</li>}
                    {quote.notes.map((n) => (
                      <li key={n}>{n}</li>
                    ))}
                  </ul>
                )}
              </>
            )}

            {step.id === "details" && (
              <div className="form">
                <div className="cfg-fields">
                  <Field id="name" label="Your name" value={details.name} error={detailErrors.name} onChange={(v) => setDetail("name", v)} autoComplete="name" />
                  <Field id="businessName" label="Business name" value={details.businessName} error={detailErrors.businessName} onChange={(v) => setDetail("businessName", v)} autoComplete="organization" />
                  <Field id="email" label="Email" type="email" value={details.email} error={detailErrors.email} onChange={(v) => setDetail("email", v)} autoComplete="email" />
                  <Field id="phone" label="Phone" type="tel" optional value={details.phone} error={detailErrors.phone} onChange={(v) => setDetail("phone", v)} autoComplete="tel" />
                  <Field id="industry" label="Industry" value={details.industry} error={detailErrors.industry} onChange={(v) => setDetail("industry", v)} placeholder="For example: hair salon" />
                  <Field id="existingWebsite" label="Existing website" optional value={details.existingWebsite} error={detailErrors.existingWebsite} onChange={(v) => setDetail("existingWebsite", v)} placeholder="yourbusiness.co.uk" inputMode="url" />
                </div>
                <Field id="description" label="What does your business do?" textarea value={details.description} error={detailErrors.description} onChange={(v) => setDetail("description", v)} />
                <Field id="customers" label="Who are your customers?" optional textarea value={details.customers} onChange={(v) => setDetail("customers", v)} />
                <div className="cfg-fields">
                  <Field id="launchDate" label="Ideal launch date" optional value={details.launchDate} onChange={(v) => setDetail("launchDate", v)} placeholder="For example: March" />
                </div>
                <Field id="requirements" label="Anything else we should know?" optional textarea value={details.requirements} onChange={(v) => setDetail("requirements", v)} />
              </div>
            )}

            {step.id === "summary" && (
              <>
                <QuoteBreakdown quote={quote} onEdit={goToId} />
                <p className="fine">
                  This is an estimate. Final pricing is confirmed in a written proposal before you commit. {VAT_NOTE}
                </p>
                {monthly && <LegalDraftNotice />}
              </>
            )}

            {step.id === "next" && (
              <form id="quote-send" onSubmit={onSend} noValidate className="form">
                <ChoiceGroup<Intent>
                  legend="Next step"
                  name="intent"
                  options={
                    (calendarEnabled
                      ? INTENTS
                      : { quote: INTENTS.quote, callback: INTENTS.callback }) as Record<Intent, { label: string; hint?: string }>
                  }
                  value={intent}
                  onChange={(v) => setIntent(v as Intent)}
                />
                {!calendarEnabled && (
                  <p className="fine">Online consultation booking is coming soon. For now, ask for a callback and we&apos;ll arrange a time.</p>
                )}
                {intent === "callback" && (
                  <Field id="callback-phone" label="Phone number for the callback" type="tel" value={details.phone} error={detailErrors.phone} onChange={(v) => setDetail("phone", v)} autoComplete="tel" />
                )}
                <div className="visually-hidden" aria-hidden="true">
                  <label htmlFor="cfg-website">Leave this field empty</label>
                  <input id="cfg-website" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
                </div>
                {state.status === "error" && !state.fields && (
                  <p className="field-error" role="alert">
                    {state.message}
                  </p>
                )}
                {state.status === "not_configured" && (
                  <p className="field-error" role="alert">
                    {state.message} <Link href="/contact">Send us a message instead</Link>.
                  </p>
                )}
                <button type="submit" className="btn btn--primary" disabled={state.status === "submitting"}>
                  {state.status === "submitting"
                    ? "Sending…"
                    : intent === "callback"
                      ? "Request my callback"
                      : "Send my quote"}
                </button>
                <p className="fine">
                  Nothing is charged now. We reply within one working day, and your price is confirmed in a written
                  proposal.
                </p>
              </form>
            )}
          </div>

          <div className={styles.nav}>
            {stepIndex > 0 ? (
              <button type="button" className="btn btn--secondary" onClick={() => goTo(stepIndex - 1)}>
                <ArrowLeft />
                Back
              </button>
            ) : (
              <span />
            )}
            {stepIndex < STEPS.length - 1 && !routed && (
              <button type="button" className="btn btn--primary" onClick={next}>
                {continueLabel}
                <ArrowRight />
              </button>
            )}
          </div>
        </section>
      </div>

      {!routed && (
        <>
          <aside className={styles.aside} aria-label="Live estimate">
            <EstimatePanel quote={quote} live />
          </aside>
          <div className={styles.dock} data-estimate-dock>
            {sheetOpen && (
              <div id="estimate-sheet" className={styles.sheet}>
                <EstimatePanel quote={quote} />
              </div>
            )}
            <button
              type="button"
              className={styles.mobileBar}
              aria-expanded={sheetOpen}
              aria-controls="estimate-sheet"
              onClick={() => setSheetOpen((v) => !v)}
            >
              <span className={styles.mobileBarLabel}>
                {quote.mode === "monthly" ? "Monthly" : "Project"}
                <strong aria-live="polite">
                  {quote.mode === "monthly"
                    ? `${formatGBP(quote.monthly)} a month · first ${formatGBP(quote.initialPayment)}`
                    : `${quote.hasFromPrices ? "from " : ""}${formatGBP(quote.oneOffTotal)}`}
                </strong>
              </span>
              <span className={styles.mobileBarToggle}>{sheetOpen ? "Hide" : "Details"}</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function addOnPrice(id: AddOnId, monthly: boolean, included: boolean): string {
  if (included) return "Included";
  const a: (typeof ADD_ONS)[AddOnId] = ADD_ONS[id];
  const from = "from" in a && a.from ? "from " : "";
  if (monthly) {
    if (a.monthly !== null) return `+${from}${formatGBP(a.monthly)} a month`;
    if ("monthlyQuoted" in a && a.monthlyQuoted) return "Custom quote";
    return `+${from}${formatGBP(a.oneOff!)} once`;
  }
  if (a.oneOff !== null) return `+${from}${formatGBP(a.oneOff)}`;
  return `+${from}${formatGBP(a.monthly!)} a month (optional)`;
}

function lineValue(line: QuoteLine, mode: WebsiteQuote["mode"]): string {
  if (line.status === "included") return "Included";
  if (line.status === "quote") return "Custom quote";
  const from = line.status === "from" ? "from " : "";
  if (line.monthly !== undefined) return `${from}${formatGBP(line.monthly)} a month`;
  if (line.oneOff !== undefined) return `${from}${formatGBP(line.oneOff)}${mode === "monthly" ? " once" : ""}`;
  return "";
}

function EstimatePanel({ quote, live = false }: { quote: WebsiteQuote; live?: boolean }) {
  return (
    <div className={styles.estimate}>
      <div className={styles.estimateHead}>
        <p className="eyebrow">Live estimate</p>
      </div>
      <p className="fine">
        {quote.packageName} · {quote.mode === "monthly" ? "monthly package" : "paid up front"}
      </p>
      {quote.mode === "monthly" ? (
        <>
          <p className={styles.price} aria-live={live ? "polite" : undefined}>
            {formatGBP(quote.monthly)}
            <span> a month</span>
          </p>
          <p className="cfg-first">
            First payment <strong>{formatGBP(quote.initialPayment)}</strong>
            <span>
              {" "}
              (setup {formatGBP(quote.setup)} + first month{quote.oneOffTotal ? " + one-off extras" : ""})
            </span>
          </p>
        </>
      ) : (
        <>
          <p className={styles.price} aria-live={live ? "polite" : undefined}>
            {quote.hasFromPrices ? <span>from </span> : null}
            {formatGBP(quote.oneOffTotal)}
          </p>
          <p className="cfg-first">
            Ongoing <strong>{quote.monthly ? `${formatGBP(quote.monthly)} a month` : "none"}</strong>
            <span> (optional)</span>
          </p>
        </>
      )}
      <ul role="list" className={styles.lineList} aria-label="Estimate breakdown">
        {quote.lines.map((l) => (
          <li key={l.label}>
            <span>{l.label}</span>
            <span>{lineValue(l, quote.mode)}</span>
          </li>
        ))}
      </ul>
      {quote.requiresQuote && <p className="fine">Some items need a custom quote. We confirm them in your proposal.</p>}
      <p className="fine">{VAT_NOTE}</p>
    </div>
  );
}

function QuoteBreakdown({ quote, onEdit }: { quote: WebsiteQuote; onEdit?: (step: StepId) => void }): ReactNode {
  const monthly = quote.mode === "monthly";
  return (
    <div className={styles.breakdown}>
      <div className="cfg-totals">
        {monthly ? (
          <>
            <div className="cfg-total cfg-total--main">
              <span>Monthly subscription</span>
              <strong>{formatGBP(quote.monthly)}</strong>
              <small>a month, {OWNERSHIP.minimumTermMonths}-month minimum term</small>
            </div>
            <div className="cfg-total">
              <span>Initial payment</span>
              <strong>{formatGBP(quote.initialPayment)}</strong>
              <small>setup {formatGBP(quote.setup)} + first month{quote.oneOffTotal ? ` + ${formatGBP(quote.oneOffTotal)} one-off` : ""}</small>
            </div>
          </>
        ) : (
          <>
            <div className="cfg-total cfg-total--main">
              <span>Total project price</span>
              <strong>
                {quote.hasFromPrices ? "from " : ""}
                {formatGBP(quote.oneOffTotal)}
              </strong>
              <small>paid up front, yours on full payment</small>
            </div>
            <div className="cfg-total">
              <span>Optional ongoing</span>
              <strong>{quote.monthly ? formatGBP(quote.monthly) : "None"}</strong>
              <small>{quote.monthly ? "a month, hosting, care and monthly extras" : `hosting from ${formatGBP(CARE_PLANS.hosting.monthly)} a month`}</small>
            </div>
          </>
        )}
      </div>
      <table className={styles.lines}>
        <caption className="visually-hidden">Quote breakdown</caption>
        <tbody>
          {monthly && (
            <tr>
              <th scope="row">Setup fee</th>
              <td>{formatGBP(quote.setup)}</td>
            </tr>
          )}
          <tr>
            <th scope="row">Pages included</th>
            <td>Up to {quote.pagesIncluded}</td>
          </tr>
          {quote.lines.map((l) => (
            <tr key={l.label}>
              <th scope="row">{l.label}</th>
              <td>{lineValue(l, quote.mode)}</td>
            </tr>
          ))}
        </tbody>
        {monthly && quote.minimumTermTotal !== null && (
          <tfoot>
            <tr>
              <th scope="row">Over the {OWNERSHIP.minimumTermMonths}-month minimum term</th>
              <td>{formatGBP(quote.minimumTermTotal)}</td>
            </tr>
          </tfoot>
        )}
      </table>
      {quote.requiresQuote && (
        <ul className="cfg-notes" role="list">
          {quote.quoteReasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      )}
      {quote.thirdParty.length > 0 && (
        <ul className="cfg-notes" role="list">
          {quote.thirdParty.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      )}
      {monthly && (
        <p className="fine">
          After {OWNERSHIP.ownershipAfterPayments} successful monthly payments, ownership of your agreed website
          deliverables transfers to you. You can carry on month to month with hosting and support.
        </p>
      )}
      {onEdit && (
        <p className="btn-row">
          <button type="button" className="arrow-link" onClick={() => onEdit("package")}>
            Change package
          </button>
          <button type="button" className="arrow-link" onClick={() => onEdit("features")}>
            Change features
          </button>
        </p>
      )}
    </div>
  );
}

function ChoiceGroup<K extends string>({
  legend,
  name,
  options,
  value,
  onChange,
  columns = 1,
  hint,
  compact = false,
}: {
  legend: string;
  name: string;
  options: Record<K, { label: string; hint?: string }>;
  value: K;
  onChange: (value: K) => void;
  columns?: 1 | 2;
  hint?: string;
  compact?: boolean;
}) {
  const id = useId();
  return (
    <fieldset className={`${styles.group}${compact ? " cfg-compact" : ""}`} aria-describedby={hint ? `${id}-hint` : undefined}>
      <legend className={styles.legend}>{legend}</legend>
      {hint && (
        <p id={`${id}-hint`} className="field-hint">
          {hint}
        </p>
      )}
      <div className={`${styles.choices} ${columns === 2 ? styles.cols2 : ""}`}>
        {(Object.keys(options) as K[]).map((key) => (
          <label key={key} className={styles.choice}>
            <input type="radio" name={`${id}-${name}`} checked={value === key} onChange={() => onChange(key)} />
            <span className={styles.choiceBody}>
              <span className={styles.choiceLabel}>{options[key].label}</span>
              {options[key].hint && <span className={styles.choiceHint}>{options[key].hint}</span>}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  error,
  optional,
  type = "text",
  autoComplete,
  placeholder,
  inputMode,
  textarea = false,
}: {
  id: keyof WebsiteDetails | "callback-phone";
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  optional?: boolean;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
  inputMode?: "url" | "tel" | "email" | "text";
  textarea?: boolean;
}) {
  const fieldId = `cfg-${id}`;
  const max = id === "callback-phone" ? DETAIL_LIMITS.phone : DETAIL_LIMITS[id];
  const common = {
    id: fieldId,
    maxLength: max,
    placeholder,
    required: !optional,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? `${fieldId}-error` : undefined,
    value,
  };
  return (
    <div className="field">
      <label htmlFor={fieldId}>
        {label} {optional && <span className="optional">(optional)</span>}
      </label>
      {textarea ? (
        <textarea {...common} className="textarea" rows={3} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input
          {...common}
          className="input"
          type={type}
          inputMode={inputMode}
          autoComplete={autoComplete}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {error && (
        <p id={`${fieldId}-error`} className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}
