"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { EMPTY_DETAILS, describeAnswers, formatBrief, type BriefDetails } from "@/lib/brief";
import { LIMITS, validateEnquiry, type FieldErrors } from "@/lib/enquiry";
import {
  BRANDING_OPTIONS,
  CARE_PLANS,
  COPY_OPTIONS,
  DEFAULT_ANSWERS,
  DESIGN_LEVELS,
  FEATURES,
  IMAGERY_OPTIONS,
  PACKAGES,
  PAGE_BANDS,
  PRICING_STATUS,
  PROJECT_TYPES,
  TIMING_OPTIONS,
  VAT_NOTE,
  effectiveFeatures,
  estimate,
  formatGBP,
  parseAnswers,
  type Answers,
  type Feature,
} from "@/lib/pricing";
import { ArrowLeft, ArrowRight } from "../Icons";
import { useEnquirySubmit } from "../useEnquirySubmit";
import styles from "./Configurator.module.css";

const STORAGE_KEY = "wnjo.configurator.v1";

const STEPS = [
  { id: "type", label: "Project", title: "What would you like to build?" },
  { id: "business", label: "Business", title: "Tell us about your business." },
  { id: "content", label: "Content", title: "How big is the site, and who's writing it?" },
  { id: "features", label: "Features", title: "What does the site need to do?" },
  { id: "design", label: "Design", title: "How should it look and feel?" },
  { id: "care", label: "Care", title: "Hosting and ongoing care." },
  { id: "timing", label: "Timing", title: "When would you like to launch?" },
  { id: "review", label: "Review", title: "Your project summary." },
  { id: "send", label: "Send", title: "Send your brief." },
] as const;
type StepId = (typeof STEPS)[number]["id"];

/** Which step each summary row is edited on. */
const SUMMARY_STEP: Record<string, StepId> = {
  "Project type": "type",
  "About the business": "business",
  Goals: "business",
  Size: "content",
  Copy: "content",
  Imagery: "content",
  Functionality: "features",
  Branding: "design",
  "Design level": "design",
  "Hosting & care": "care",
  Timing: "timing",
};

type Saved = { answers: Answers; details: BriefDetails };

function loadSaved(): Saved | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as { answers?: unknown; details?: Partial<BriefDetails> };
    const answers = parseAnswers(data.answers);
    if (!answers) return null;
    return {
      answers,
      details: {
        business: String(data.details?.business ?? "").slice(0, LIMITS.message),
        goals: String(data.details?.goals ?? "").slice(0, LIMITS.message),
        launchDate: String(data.details?.launchDate ?? "").slice(0, LIMITS.launchDate),
      },
    };
  } catch {
    return null;
  }
}

function store(saved: Saved | null) {
  try {
    if (saved) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* Storage unavailable (private mode, blocked). The configurator still works. */
  }
}

/** Choices carried over in the link, e.g. ?pages=6-12 from a pricing card or ?care=care from a plan. */
export type ConfiguratorParams = { type?: string; pages?: string; care?: string; business?: string };

/** Initial answers: saved progress (in the browser only), then any choices carried over in the link. */
function initialState(params: ConfiguratorParams, withSaved: boolean): Saved {
  const saved = (withSaved ? loadSaved() : null) ?? { answers: DEFAULT_ANSWERS, details: EMPTY_DETAILS };
  const merged = parseAnswers({
    ...saved.answers,
    ...(params.type && { projectType: params.type }),
    ...(params.pages && { pageBand: params.pages }),
    ...(params.care && { carePlan: params.care }),
  });
  // A business carried in the link (e.g. from the homepage's example sites) fills an empty answer only.
  const business = params.business?.trim().slice(0, 60);
  const details = business && !saved.details.business ? { ...saved.details, business } : saved.details;
  return { answers: merged ?? saved.answers, details };
}

const noopSubscribe = () => () => {};

/**
 * Saved progress lives in localStorage, which the server can't see. The server
 * renders the first step with the link's choices, so the page arrives at its
 * final size; once hydrated, it remounts with any saved progress. Both start on
 * the same step, so nothing moves.
 */
export function Configurator({ params }: { params: ConfiguratorParams }) {
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);
  return <ConfiguratorInner key={hydrated ? "browser" : "server"} params={params} inBrowser={hydrated} />;
}

function ConfiguratorInner({ params, inBrowser }: { params: ConfiguratorParams; inBrowser: boolean }) {
  const [init] = useState(() => initialState(params, inBrowser));
  const [answers, setAnswers] = useState<Answers>(init.answers);
  const [details, setDetails] = useState<BriefDetails>(init.details);
  const [stepIndex, setStepIndex] = useState(0);
  const [furthest, setFurthest] = useState(0);
  const [contact, setContact] = useState({ name: "", email: "", company: "", message: "", website: "" });
  const [contactErrors, setContactErrors] = useState<FieldErrors>({});
  const [startedAt] = useState(() => Date.now());
  const [copied, setCopied] = useState<"idle" | "done" | "failed">("idle");
  const [sheetOpen, setSheetOpen] = useState(false);
  const { state, submit } = useEnquirySubmit();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  const result = useMemo(() => estimate(answers), [answers]);
  const step = STEPS[stepIndex];

  // Save progress locally; clear it once the brief has been sent. The server-rendered
  // pass never writes, or it would replace saved progress with the defaults.
  useEffect(() => {
    if (!inBrowser) return;
    store(state.status === "success" ? null : { answers, details });
  }, [answers, details, state.status, inBrowser]);

  // Move focus to the new step's heading so keyboard and screen-reader users keep their place.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus({ preventScroll: true });
    headingRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [stepIndex]);

  const set = <K extends keyof Answers>(key: K, value: Answers[K]) => setAnswers((a) => ({ ...a, [key]: value }));
  const goTo = (index: number) => {
    setStepIndex(index);
    setFurthest((f) => Math.max(f, index));
  };
  const goToId = (id: StepId) => goTo(STEPS.findIndex((s) => s.id === id));

  const implied = new Set<Feature>(effectiveFeatures({ projectType: answers.projectType, features: [] }));
  const toggleFeature = (f: Feature) =>
    set("features", answers.features.includes(f) ? answers.features.filter((x) => x !== f) : [...answers.features, f]);

  const briefText = () =>
    [
      `Name: ${contact.name}`,
      `Email: ${contact.email}`,
      ...(contact.company ? [`Company: ${contact.company}`] : []),
      "",
      formatBrief(answers, details),
      ...(contact.message ? ["", `Notes: ${contact.message}`] : []),
    ].join("\n");

  const copyBrief = async () => {
    try {
      await navigator.clipboard.writeText(briefText());
      setCopied("done");
    } catch {
      setCopied("failed");
    }
  };

  const onSend = async (event: React.FormEvent) => {
    event.preventDefault();
    const check = validateEnquiry({ ...contact, topic: "website" }, { messageRequired: false });
    if (!check.ok) {
      setContactErrors(check.errors);
      return;
    }
    setContactErrors({});
    await submit({
      kind: "brief",
      topic: answers.projectType === "webapp" ? "bespoke" : "website",
      ...contact,
      ...details,
      answers,
      startedAt,
    });
  };

  const serverErrors = state.status === "error" ? (state.fields ?? {}) : {};
  const errors = { ...serverErrors, ...contactErrors };

  if (state.status === "success") {
    return (
      <div className={styles.done}>
        <div className="card card--raised stack" data-print-root style={{ "--stack": "var(--space-5)" } as React.CSSProperties}>
          <p className="print-only">WNJO · www.wnjoweb.co.uk</p>
          <p className="eyebrow">Brief received</p>
          <h2 className="h2" tabIndex={-1} ref={(el) => el?.focus()}>
            {state.quoteReference
              ? <>Your quote is ready, {contact.name.split(" ")[0]}.</>
              : <>Thank you, {contact.name.split(" ")[0]}. Your brief is with us.</>}
          </h2>
          {state.quoteReference ? (
            <p className="muted">
              Quote <strong>{state.quoteReference}</strong> is on its way to <strong>{contact.email}</strong>. Sign in with
              that email to see it in full and accept it. Nothing is charged until you do.
            </p>
          ) : (
            <p className="muted">
              The price above is your estimate. We&apos;ll check your answers and send your bespoke quote to{" "}
              <strong>{contact.email}</strong>. Nothing is booked or charged until you accept it.
            </p>
          )}
          <SummaryList answers={answers} details={details} />
          <EstimateBreakdown result={result} answers={answers} />
          <div className="btn-row">
            {state.quoteReference && (
              <Link href="/account" className="btn btn--primary">
                Sign in to see your quote
              </Link>
            )}
            <button type="button" className="btn btn--secondary" onClick={() => window.print()}>
              Save or print
            </button>
            <Link href="/" className="btn btn--secondary">
              Back to home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.layout}>
      <div className={styles.main}>
        <nav aria-label="Configurator progress" className={styles.progress}>
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
                  disabled={i > furthest}
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
            {step.id === "type" && (
              <ChoiceGroup
                legend="Project type"
                name="projectType"
                options={PROJECT_TYPES}
                value={answers.projectType}
                onChange={(v) => set("projectType", v)}
                columns={2}
              />
            )}

            {step.id === "business" && (
              <div className="form">
                <p className="muted">
                  Optional, but it helps us give you a useful reply. A sentence or two is plenty.
                </p>
                <div className="field">
                  <label htmlFor="business">
                    What does your business do? <span className="optional">(optional)</span>
                  </label>
                  <textarea
                    id="business"
                    className="textarea"
                    rows={3}
                    maxLength={LIMITS.message}
                    value={details.business}
                    onChange={(e) => setDetails((d) => ({ ...d, business: e.target.value }))}
                  />
                </div>
                <div className="field">
                  <label htmlFor="goals">
                    What should the website achieve? <span className="optional">(optional)</span>
                  </label>
                  <textarea
                    id="goals"
                    className="textarea"
                    rows={3}
                    maxLength={LIMITS.message}
                    placeholder="For example: more enquiries from local customers, or taking bookings online."
                    value={details.goals}
                    onChange={(e) => setDetails((d) => ({ ...d, goals: e.target.value }))}
                  />
                </div>
              </div>
            )}

            {step.id === "content" && (
              <>
                <ChoiceGroup
                  legend="Approximate number of pages"
                  name="pageBand"
                  options={PAGE_BANDS}
                  value={answers.pageBand}
                  onChange={(v) => set("pageBand", v)}
                  columns={2}
                  hint="Count each distinct page: home, about, each service, contact and so on."
                />
                <ChoiceGroup
                  legend="Written content"
                  name="copy"
                  options={COPY_OPTIONS}
                  value={answers.copy}
                  onChange={(v) => set("copy", v)}
                />
                <ChoiceGroup
                  legend="Imagery"
                  name="imagery"
                  options={IMAGERY_OPTIONS}
                  value={answers.imagery}
                  onChange={(v) => set("imagery", v)}
                  columns={2}
                />
              </>
            )}

            {step.id === "features" && (
              <fieldset className={styles.group}>
                <legend className={styles.legend}>Choose any that apply</legend>
                <p className="field-hint">An enquiry form is included in every package.</p>
                <div className={`${styles.choices} ${styles.cols2}`}>
                  {(Object.keys(FEATURES) as Feature[]).map((f) => {
                    const isImplied = implied.has(f);
                    return (
                      <label key={f} className={styles.choice}>
                        <input
                          type="checkbox"
                          checked={isImplied || answers.features.includes(f)}
                          disabled={isImplied}
                          onChange={() => toggleFeature(f)}
                        />
                        <span className={styles.choiceBody}>
                          <span className={styles.choiceLabel}>{FEATURES[f].label}</span>
                          <span className={styles.choiceHint}>
                            {isImplied ? `Included for a ${PROJECT_TYPES[answers.projectType].label.toLowerCase()}.` : FEATURES[f].hint}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
                {(answers.features.includes("payments") || implied.has("payments")) && (
                  <p className="notice mt-5">
                    Payment providers charge their own transaction fees. These are paid to the provider and are not
                    part of our price.
                  </p>
                )}
              </fieldset>
            )}

            {step.id === "design" && (
              <>
                <ChoiceGroup
                  legend="Your brand today"
                  name="branding"
                  options={BRANDING_OPTIONS}
                  value={answers.branding}
                  onChange={(v) => set("branding", v)}
                />
                <ChoiceGroup
                  legend="Level of custom design and interaction"
                  name="designLevel"
                  options={DESIGN_LEVELS}
                  value={answers.designLevel}
                  onChange={(v) => set("designLevel", v)}
                />
              </>
            )}

            {step.id === "care" && (
              <>
                <p className="muted">
                  Ongoing plans are billed monthly and kept separate from the one-off build price. You can change or
                  cancel later.
                </p>
                <fieldset className={styles.group}>
                  <legend className="visually-hidden">Hosting and care plan</legend>
                  <div className={`${styles.choices} ${styles.cols2}`}>
                    {(Object.keys(CARE_PLANS) as (keyof typeof CARE_PLANS)[]).map((p) => {
                      const plan = CARE_PLANS[p];
                      return (
                        <label key={p} className={styles.choice}>
                          <input
                            type="radio"
                            name="carePlan"
                            checked={answers.carePlan === p}
                            onChange={() => set("carePlan", p)}
                          />
                          <span className={styles.choiceBody}>
                            <span className={styles.choiceLabel}>
                              {plan.label}
                              <span className={styles.choicePrice}>
                                {plan.monthly ? `${formatGBP(plan.monthly)}/mo` : "£0"}
                              </span>
                            </span>
                            <span className={styles.choiceHint}>{plan.summary}</span>
                            {plan.includes.length > 0 && (
                              <ul role="list" className={`checks ${styles.planList}`}>
                                {plan.includes.map((item) => (
                                  <li key={item}>{item}</li>
                                ))}
                              </ul>
                            )}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
                <p className="fine">
                  Domain names, business email, paid licences and third-party subscriptions are not included in any
                  plan. <Link href="/pricing#care">See what&apos;s covered</Link>.
                </p>
              </>
            )}

            {step.id === "timing" && (
              <>
                <ChoiceGroup
                  legend="Preferred launch"
                  name="timing"
                  options={TIMING_OPTIONS}
                  value={answers.timing}
                  onChange={(v) => set("timing", v)}
                  columns={2}
                />
                {answers.timing === "date" && (
                  <div className="field">
                    <label htmlFor="launchDate">Target date, and why it matters</label>
                    <input
                      id="launchDate"
                      className="input"
                      maxLength={LIMITS.launchDate}
                      placeholder="For example: 1 March, ahead of our spring opening"
                      value={details.launchDate}
                      onChange={(e) => setDetails((d) => ({ ...d, launchDate: e.target.value }))}
                    />
                  </div>
                )}
                <p className="fine">
                  We confirm delivery dates against availability once the scope is agreed. This answer isn&apos;t a
                  booking.
                </p>
              </>
            )}

            {step.id === "review" && (
              <>
                <SummaryList answers={answers} details={details} onEdit={goToId} />
                <EstimateBreakdown result={result} answers={answers} />
                <NextSteps requiresScope={result.requiresScope} reasons={result.scopeReasons} />
              </>
            )}

            {step.id === "send" && (
              <form className="form" onSubmit={onSend} noValidate>
                <p className="muted">
                  This is your estimate. We&apos;ll check your answers and email your bespoke quote. Nothing is charged now.
                </p>
                <div className="form-row">
                  <TextField
                    id="name"
                    label="Your name"
                    autoComplete="name"
                    value={contact.name}
                    error={errors.name}
                    maxLength={LIMITS.name}
                    onChange={(v) => setContact((c) => ({ ...c, name: v }))}
                  />
                  <TextField
                    id="email"
                    label="Email"
                    type="email"
                    autoComplete="email"
                    value={contact.email}
                    error={errors.email}
                    maxLength={LIMITS.email}
                    onChange={(v) => setContact((c) => ({ ...c, email: v }))}
                  />
                </div>
                <TextField
                  id="company"
                  label="Business name"
                  optional
                  autoComplete="organization"
                  value={contact.company}
                  maxLength={LIMITS.company}
                  onChange={(v) => setContact((c) => ({ ...c, company: v }))}
                />
                <div className="field">
                  <label htmlFor="notes">
                    Anything else we should know? <span className="optional">(optional)</span>
                  </label>
                  <textarea
                    id="notes"
                    className="textarea"
                    rows={4}
                    maxLength={LIMITS.message}
                    value={contact.message}
                    onChange={(e) => setContact((c) => ({ ...c, message: e.target.value }))}
                  />
                </div>
                <div className="hp-field" aria-hidden="true">
                  <label htmlFor="website">Leave this field empty</label>
                  <input
                    id="website"
                    tabIndex={-1}
                    autoComplete="off"
                    value={contact.website}
                    onChange={(e) => setContact((c) => ({ ...c, website: e.target.value }))}
                  />
                </div>

                <div aria-live="polite">
                  {state.status === "error" && (
                    <p className="form-status form-status--error" role="alert">
                      {state.message}
                    </p>
                  )}
                  {state.status === "not_configured" && (
                    <div className="form-status form-status--error" role="alert">
                      <strong>Your brief has not been sent.</strong>
                      {state.message} Your answers are saved in this browser. You can copy the full brief to send
                      another way.
                      <div className="btn-row mt-4">
                        <button type="button" className="btn btn--secondary btn--sm" onClick={copyBrief}>
                          Copy brief to clipboard
                        </button>
                      </div>
                      {copied === "done" && <p className="mt-4">Copied.</p>}
                      {copied === "failed" && <p className="mt-4">Your browser blocked copying.</p>}
                    </div>
                  )}
                </div>

                <p className="fine">
                  We use these details only to respond to your brief. See our <Link href="/privacy">privacy notice</Link>.
                </p>
                <div className="btn-row">
                  <button type="submit" className="btn btn--primary" disabled={state.status === "submitting"}>
                    {state.status === "submitting" ? "Sending…" : "Send brief"}
                  </button>
                </div>
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
            {stepIndex < STEPS.length - 1 && (
              <button type="button" className="btn btn--primary" onClick={() => goTo(stepIndex + 1)}>
                {STEPS[stepIndex + 1].id === "review" ? "Review summary" : STEPS[stepIndex + 1].id === "send" ? "Continue to send" : "Continue"}
                <ArrowRight />
              </button>
            )}
          </div>
          {/* The fast path: skip the detail, see a rough price now, and get the bespoke quote afterwards. */}
          {stepIndex < STEPS.findIndex((s) => s.id === "review") && (
            <p className={styles.skip}>
              <button type="button" className="arrow-link" onClick={() => goToId("review")}>
                Skip the details and see my estimate <ArrowRight />
              </button>
            </p>
          )}
        </section>
      </div>

      <aside className={styles.aside} aria-label="Live estimate">
        <EstimatePanel result={result} live />
      </aside>

      <div className={styles.dock} data-estimate-dock>
        {sheetOpen && (
          <div id="estimate-sheet" className={styles.sheet}>
            <EstimatePanel result={result} />
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
            Estimate
            <strong aria-live="polite">
              {formatGBP(result.range.low)} to {formatGBP(result.range.high)}
            </strong>
          </span>
          <span className={styles.mobileBarToggle}>{sheetOpen ? "Hide" : "Details"}</span>
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function EstimatePanel({ result, live = false }: { result: ReturnType<typeof estimate>; live?: boolean }) {
  return (
    <div className={styles.estimate}>
      <div className={styles.estimateHead}>
        <p className="eyebrow">Live estimate</p>
        {PRICING_STATUS === "provisional" && <span className={styles.badge}>Provisional</span>}
      </div>
      <p className="fine">{PACKAGES[result.packageId].name} package · one-off build</p>
      <p className={styles.price} aria-live={live ? "polite" : undefined}>
        {formatGBP(result.range.low)}
        <span> to {formatGBP(result.range.high)}</span>
      </p>
      <ul role="list" className={styles.lineList} aria-label="Build cost breakdown">
        {result.lineItems.map((item) => (
          <li key={item.label}>
            <span>{item.label}</span>
            <span>{formatGBP(item.amount)}</span>
          </li>
        ))}
      </ul>
      <dl className={styles.mini}>
        <div>
          <dt>Monthly</dt>
          <dd>{result.monthly ? `${formatGBP(result.monthly)}/mo` : "None"}</dd>
        </div>
        <div>
          <dt>Pricing</dt>
          <dd>{result.requiresScope ? "Confirmed after scoping" : "Fixed-scope package"}</dd>
        </div>
      </dl>
      <p className="fine">{VAT_NOTE}</p>
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
}: {
  legend: string;
  name: string;
  options: Record<K, { label: string; hint?: string }>;
  value: K;
  onChange: (value: K) => void;
  columns?: 1 | 2;
  hint?: string;
}) {
  const id = useId();
  return (
    <fieldset className={styles.group} aria-describedby={hint ? `${id}-hint` : undefined}>
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

function TextField({
  id,
  label,
  value,
  onChange,
  error,
  optional,
  type = "text",
  autoComplete,
  maxLength,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  optional?: boolean;
  type?: string;
  autoComplete?: string;
  maxLength?: number;
}) {
  return (
    <div className="field">
      <label htmlFor={id}>
        {label} {optional && <span className="optional">(optional)</span>}
      </label>
      <input
        id={id}
        className="input"
        type={type}
        autoComplete={autoComplete}
        maxLength={maxLength}
        required={!optional}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {error && (
        <p id={`${id}-error`} className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}

function SummaryList({
  answers,
  details,
  onEdit,
}: {
  answers: Answers;
  details: BriefDetails;
  onEdit?: (step: StepId) => void;
}) {
  return (
    <dl className={styles.summary}>
      {describeAnswers(answers, details).map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
          {onEdit && (
            <button type="button" className={styles.edit} onClick={() => onEdit(SUMMARY_STEP[label])}>
              Edit<span className="visually-hidden"> {label.toLowerCase()}</span>
            </button>
          )}
        </div>
      ))}
    </dl>
  );
}

function EstimateBreakdown({ result, answers }: { result: ReturnType<typeof estimate>; answers: Answers }): ReactNode {
  return (
    <div className={styles.breakdown}>
      <h3 className="h3">Indicative estimate</h3>
      <table className={styles.lines}>
        <caption className="visually-hidden">One-off build costs</caption>
        <tbody>
          {result.lineItems.map((item) => (
            <tr key={item.label}>
              <th scope="row">{item.label}</th>
              <td>{formatGBP(item.amount)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">Estimated build</th>
            <td>
              {formatGBP(result.range.low)} to {formatGBP(result.range.high)}
            </td>
          </tr>
          <tr>
            <th scope="row">Ongoing ({CARE_PLANS[answers.carePlan].label})</th>
            <td>{result.monthly ? `${formatGBP(result.monthly)}/mo` : "None"}</td>
          </tr>
        </tfoot>
      </table>
      <p className="fine">
        The range allows for detail we only learn once we&apos;ve seen your content. {VAT_NOTE}
        {PRICING_STATUS === "provisional" && " Prices are provisional and confirmed in writing before you commit."}
      </p>
      <div className="grid-2">
        <div>
          <h4 className={styles.subhead}>Included</h4>
          <ul role="list" className="checks">
            {PACKAGES[result.packageId].includes.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className={styles.subhead}>Not included</h4>
          <ul role="list" className="checks checks--dash">
            {result.exclusions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
      <div>
        <h4 className={styles.subhead}>Assumptions</h4>
        <ul role="list" className="checks checks--dash">
          {result.assumptions.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function NextSteps({ requiresScope, reasons }: { requiresScope: boolean; reasons: string[] }) {
  return (
    <div className={styles.next}>
      <h3 className="h3">What happens next</h3>
      {requiresScope ? (
        <>
          <p className="muted">
            Part of this brief needs a short conversation before we can give a binding price:
          </p>
          <ul role="list" className="checks checks--dash">
            {reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
          <p className="muted">
            Send the brief and we&apos;ll arrange a scoping call, then confirm scope, price and timing in writing.
          </p>
        </>
      ) : (
        <p className="muted">
          This brief fits a fixed-scope package. Send it and we&apos;ll confirm the deliverables, price and payment
          terms in writing before any work or payment.
        </p>
      )}
    </div>
  );
}
