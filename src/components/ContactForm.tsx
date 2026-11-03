"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import {
  BUDGETS,
  LIMITS,
  TIMELINES,
  TOPICS,
  validateEnquiry,
  type Budget,
  type FieldErrors,
  type Timeline,
  type Topic,
} from "@/lib/enquiry";
import { PACKAGES, formatGBP } from "@/lib/pricing";
import { ArrowLeft, ArrowRight } from "./Icons";
import { useEnquirySubmit } from "./useEnquirySubmit";

const isTopic = (value: unknown): value is Topic =>
  typeof value === "string" && Object.prototype.hasOwnProperty.call(TOPICS, value);

type Fields = {
  name: string;
  email: string;
  topic: Topic | "";
  /** Current website, asked only for redesigns and hosting; sent as part of the message. */
  site: string;
  budget: Budget | "";
  timeline: Timeline | "";
  message: string;
  /** Honeypot. */
  website: string;
};

type FieldKey = keyof FieldErrors;

const STEPS: { title: string; short: string; fields: FieldKey[] }[] = [
  { title: "What can we help with?", short: "Project", fields: ["topic", "message"] },
  { title: "What budget and timing do you have in mind?", short: "Budget", fields: ["budget", "timeline"] },
  { title: "Where should we reply?", short: "Details", fields: ["name", "email"] },
  { title: "Ready to send?", short: "Review", fields: [] },
];
const REVIEW = STEPS.length - 1;
const SITE_LIMIT = 200;

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

/** What each option means, a line icon, and example goals visitors can tap to add. */
const OPTIONS: Record<Topic, { note: string; icon: ReactNode; examples: string[]; askSite?: boolean }> = {
  website: {
    note: "A bespoke site for your business",
    icon: (
      <>
        <rect x="3" y="4.5" width="18" height="15" rx="2.5" {...stroke} />
        <path d="M3 9h18" {...stroke} />
      </>
    ),
    examples: ["More enquiries from local customers", "Take bookings online", "Look as good as we are"],
  },
  redesign: {
    note: "Refresh or rebuild an existing site",
    icon: (
      <>
        <path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3" {...stroke} />
        <path d="M19.5 4.5v3.75h-3.75" {...stroke} />
      </>
    ),
    examples: ["It's slow on phones", "It's hard to update", "It looks dated"],
    askSite: true,
  },
  bespoke: {
    note: "Web and mobile apps, portals and tools",
    icon: (
      <>
        <rect x="3.75" y="3.75" width="6.75" height="6.75" rx="1.5" {...stroke} />
        <rect x="13.5" y="3.75" width="6.75" height="6.75" rx="1.5" {...stroke} />
        <rect x="3.75" y="13.5" width="6.75" height="6.75" rx="1.5" {...stroke} />
        <path d="M16.9 13.5v6.75M13.5 16.9h6.75" {...stroke} />
      </>
    ),
    examples: ["Replace our spreadsheets", "Give customers their own app", "Automate a manual process"],
  },
  "booking-software": {
    note: "See the booking system in action",
    icon: (
      <>
        <rect x="3.75" y="5.25" width="16.5" height="15" rx="2.5" {...stroke} />
        <path d="M3.75 9.75h16.5M8.25 3v4.5M15.75 3v4.5M9 15l2 2 4-4" {...stroke} />
      </>
    ),
    examples: ["Let customers book online", "Manage drivers and jobs in one place", "Send confirmations automatically"],
  },
  care: {
    note: "Look after a site you already have",
    icon: (
      <path d="M12 3.75 4.5 6.75v5.25c0 4.1 3.1 7.4 7.5 8.25 4.4-.85 7.5-4.15 7.5-8.25V6.75L12 3.75Z" {...stroke} />
    ),
    examples: ["Keep it secure and up to date", "Small changes each month", "Move to better hosting"],
    askSite: true,
  },
  other: {
    note: "Tell us what you have in mind",
    icon: (
      <>
        <circle cx="6" cy="12" r="1.25" fill="currentColor" />
        <circle cx="12" cy="12" r="1.25" fill="currentColor" />
        <circle cx="18" cy="12" r="1.25" fill="currentColor" />
      </>
    ),
    examples: [],
  },
};

/*
 * Progress is kept for this browser tab only, so a refresh or a detour doesn't lose
 * it. Name and email are never stored; they stay in memory until the form is sent.
 */
const DRAFT_KEY = "wnjo-enquiry-draft";
const SENT_KEY = "wnjo-enquiry-sent";

type Draft = Pick<Fields, "topic" | "site" | "budget" | "timeline" | "message">;

function readSession<T>(key: string): T | null {
  try {
    const raw = window.sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeSession(key: string, value: unknown) {
  try {
    if (value === null) window.sessionStorage.removeItem(key);
    else window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Storage unavailable (private mode, blocked). The form still works. */
  }
}

/** A brief handed over in the link (?brief=, e.g. from the booking app configurator): plain text, trimmed to size. */
const cleanBrief = (brief: string | undefined) =>
  brief
    ?.replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, "")
    .trim()
    .slice(0, LIMITS.message) || "";

function initialFields(topicParam: string | undefined, briefParam: string | undefined, inBrowser: boolean): Fields {
  const draft = (inBrowser ? readSession<Partial<Draft>>(DRAFT_KEY) : null) ?? {};
  const brief = cleanBrief(briefParam);
  return {
    name: "",
    email: "",
    // A ?topic= link reflects what the visitor just chose, so it wins over an older draft.
    topic: isTopic(topicParam) ? topicParam : isTopic(draft.topic) ? draft.topic : "",
    site: typeof draft.site === "string" ? draft.site.slice(0, SITE_LIMIT) : "",
    budget: typeof draft.budget === "string" && draft.budget in BUDGETS ? (draft.budget as Budget) : "",
    timeline: typeof draft.timeline === "string" && draft.timeline in TIMELINES ? (draft.timeline as Timeline) : "",
    // Likewise a brief in the link: the app the visitor just designed.
    message: brief || (typeof draft.message === "string" ? draft.message.slice(0, LIMITS.message) : ""),
    website: "",
  };
}

/** The message as sent: the current website (when asked for) ahead of the visitor's goals. */
const composeMessage = (f: Fields) =>
  f.topic && OPTIONS[f.topic].askSite && f.site.trim()
    ? `Current website: ${f.site.trim()}\n\n${f.message}`
    : f.message;

type Choice<K extends string> = { value: K; title: string; note: string; icon?: ReactNode };

/** A group of selection cards (radio buttons underneath). */
function OptionCards<K extends string>({
  name,
  legend,
  showLegend,
  choices,
  value,
  onChange,
  error,
  compact,
}: {
  name: string;
  legend: string;
  showLegend?: boolean;
  choices: Choice<K>[];
  value: K | "";
  onChange: (v: K) => void;
  error?: string;
  compact?: boolean;
}) {
  return (
    <fieldset className="field" aria-describedby={error ? `contact-${name}-error` : undefined}>
      <legend className={showLegend ? undefined : "visually-hidden"}>{legend}</legend>
      <div className={`option-cards${compact ? " option-cards--compact" : ""}`}>
        {choices.map((c, i) => (
          <label key={c.value} className="option-card">
            <input
              type="radio"
              name={`contact-${name}`}
              id={i === 0 ? `contact-${name}` : undefined}
              value={c.value}
              checked={value === c.value}
              onChange={() => onChange(c.value)}
            />
            <span className="option-card__body">
              {c.icon && (
                <svg className="option-card__icon" width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
                  {c.icon}
                </svg>
              )}
              <span className="option-card__title">{c.title}</span>
              <span className="option-card__note">{c.note}</span>
            </span>
          </label>
        ))}
      </div>
      {error && (
        <p id={`contact-${name}-error`} className="field-error">
          {error}
        </p>
      )}
    </fieldset>
  );
}

const TOPIC_CHOICES: Choice<Topic>[] = (Object.keys(TOPICS) as Topic[]).map((t) => ({
  value: t,
  title: TOPICS[t],
  note: OPTIONS[t].note,
  icon: OPTIONS[t].icon,
}));

// Budget notes point at the published starting prices, so they stay in step with lib/pricing.
const BUDGET_NOTES: Record<Budget, string> = {
  "under-2k": `Essential starts at ${formatGBP(PACKAGES.essential.from)}`,
  "2k-5k": `Professional starts at ${formatGBP(PACKAGES.professional.from)}`,
  "5k-10k": `Premium starts at ${formatGBP(PACKAGES.premium.from)}`,
  "10k-plus": "Larger sites and software",
  unsure: "We'll help you work it out",
};
const BUDGET_CHOICES: Choice<Budget>[] = (Object.keys(BUDGETS) as Budget[]).map((b) => ({
  value: b,
  title: BUDGETS[b],
  note: BUDGET_NOTES[b],
}));

const TIMELINE_NOTES: Record<Timeline, string> = {
  asap: "Ready to start now",
  "1-3m": "In the next few months",
  "3-6m": "Planning ahead",
  flexible: "No fixed deadline",
};
const TIMELINE_CHOICES: Choice<Timeline>[] = (Object.keys(TIMELINES) as Timeline[]).map((t) => ({
  value: t,
  title: TIMELINES[t],
  note: TIMELINE_NOTES[t],
}));

/**
 * The enquiry journey: three short steps and a review, then a confirmation with
 * a reference. Validation matches the server, which has the final say.
 */
const noopSubscribe = () => () => {};

/**
 * The server renders the form from the link (?topic=, ?brief=), so the page arrives at
 * its final size. Once hydrated it remounts with anything kept in this tab's session.
 */
export function ContactForm({ topic, brief }: { topic?: string; brief?: string }) {
  const hydrated = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  return (
    <EnquiryForm key={hydrated ? "browser" : "server"} topicParam={topic} briefParam={brief} inBrowser={hydrated} />
  );
}

function EnquiryForm({
  topicParam,
  briefParam,
  inBrowser,
}: {
  topicParam?: string;
  briefParam?: string;
  inBrowser: boolean;
}) {
  const [fields, setFields] = useState<Fields>(() => initialFields(topicParam, briefParam, inBrowser));
  const [step, setStep] = useState(0);
  const [furthest, setFurthest] = useState(0);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [startedAt] = useState(() => Date.now());
  const [previous, setPrevious] = useState(() => (inBrowser ? readSession<{ reference?: string }>(SENT_KEY) : null));
  const { state, submit, reset } = useEnquirySubmit();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);

  // The server-rendered pass never writes, or it would replace the saved draft.
  useEffect(() => {
    if (!inBrowser) return;
    const { topic, site, budget, timeline, message } = fields;
    writeSession(DRAFT_KEY, { topic, site, budget, timeline, message });
  }, [fields, inBrowser]);

  // Move focus to the new step's heading, but not on first load.
  useEffect(() => {
    if (moved.current) headingRef.current?.focus();
  }, [step, state.status]);

  const set = <K extends keyof Fields>(key: K, value: Fields[K]) => {
    setFields((f) => ({ ...f, [key]: value }));
    if (errors[key as FieldKey]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const addExample = (text: string) =>
    set("message", fields.message.trim() ? `${fields.message.trim()}\n${text}.` : `${text}.`);

  const goTo = (next: number) => {
    moved.current = true;
    setStep(next);
    setFurthest((f) => Math.max(f, next));
  };

  const errorsFor = (from: number, to: number) => {
    const keys = STEPS.slice(from, to + 1).flatMap((s) => s.fields);
    const check = validateEnquiry({ ...fields, message: composeMessage(fields) }, { detailsRequired: true });
    const found: FieldErrors = check.ok ? {} : { ...check.errors };
    // The server files anything unrecognised under "Something else"; here we ask for a clear choice.
    if (!fields.topic) found.topic = "Choose the option closest to what you need.";
    // Goals are judged on what the visitor wrote, not the website line added in front.
    if (fields.message.trim().length < 10 && !found.message) {
      found.message = "Please tell us a little about your goals (at least 10 characters).";
    }
    return Object.fromEntries(Object.entries(found).filter(([k]) => keys.includes(k as FieldKey))) as FieldErrors;
  };

  const focusFirstError = (found: FieldErrors, form: HTMLFormElement) => {
    const first = STEPS[step].fields.find((k) => found[k]);
    if (first) window.requestAnimationFrame(() => form.querySelector<HTMLElement>(`#contact-${first}`)?.focus());
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;

    if (step < REVIEW) {
      const found = errorsFor(step, step);
      setErrors(found);
      if (Object.keys(found).length) return focusFirstError(found, form);
      return goTo(step + 1);
    }

    // Review: check everything once more, and send the visitor back to anything missing.
    const all = errorsFor(0, REVIEW);
    if (Object.keys(all).length) {
      setErrors(all);
      return goTo(STEPS.findIndex((s) => s.fields.some((k) => all[k])));
    }
    const { name, email, topic, budget, timeline, website } = fields;
    const result = await submit({
      kind: "contact",
      name,
      email,
      topic,
      budget,
      timeline,
      website,
      message: composeMessage(fields),
      startedAt,
    });
    if (result?.status === "success") {
      writeSession(DRAFT_KEY, null);
      writeSession(SENT_KEY, { reference: result.reference });
      moved.current = true;
    } else if (result?.status === "error" && result.fields) {
      setErrors(result.fields);
      const bad = STEPS.findIndex((s) => s.fields.some((k) => result.fields?.[k]));
      if (bad >= 0) goTo(bad);
    }
  };

  const startAnother = () => {
    writeSession(SENT_KEY, null);
    setPrevious(null);
    setFields((f) => ({ ...f, topic: "", site: "", budget: "", timeline: "", message: "" }));
    setErrors({});
    setStep(0);
    setFurthest(0);
    reset();
  };

  const firstName = fields.name.trim().split(/\s+/)[0];

  // Confirmation after sending.
  if (state.status === "success") {
    return (
      <div className="onboard-done" role="status">
        <p className="onboard-done__mark" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
            <path
              d="m4.5 10.5 3.5 3.5 7.5-8"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </p>
        <h2 ref={headingRef} tabIndex={-1} className="onboard-title">
          {firstName ? `Thanks, ${firstName}.` : "Thank you."} Your enquiry is with us.
        </h2>
        <p className="muted">
          We&apos;ll read it properly and reply to <strong>{fields.email}</strong> with questions, advice or a suggested
          next step. There&apos;s nothing to pay unless you approve a written quote.
        </p>
        {state.reference && (
          <p className="onboard-ref">
            <span>Your reference</span>
            <strong className="mono">{state.reference}</strong>
          </p>
        )}
        <div className="btn-row">
          <Link href="/work" className="btn btn--secondary">
            See our work
          </Link>
          <button type="button" className="btn btn--secondary" onClick={startAnother}>
            Send another enquiry
          </button>
        </div>
      </div>
    );
  }

  // A returning visitor who already sent an enquiry in this tab.
  if (previous && state.status === "idle") {
    return (
      <div className="onboard-done" role="status">
        <h2 className="onboard-title">Your enquiry is with us.</h2>
        <p className="muted">We&apos;ll reply by email. If there&apos;s something new, you can send another.</p>
        {previous.reference && (
          <p className="onboard-ref">
            <span>Your reference</span>
            <strong className="mono">{previous.reference}</strong>
          </p>
        )}
        <div className="btn-row">
          <button type="button" className="btn btn--primary" onClick={startAnother}>
            Send another enquiry
          </button>
        </div>
      </div>
    );
  }

  const allErrors = { ...(state.status === "error" ? state.fields : {}), ...errors };
  const describe = (key: FieldKey) => (allErrors[key] ? `contact-${key}-error` : undefined);
  const sending = state.status === "submitting";
  const option = fields.topic ? OPTIONS[fields.topic] : null;

  const review: [string, string, number][] = [
    ["Project", fields.topic ? TOPICS[fields.topic] : "", 0],
    ...(option?.askSite ? ([["Current website", fields.site.trim(), 0]] as [string, string, number][]) : []),
    ["Goals", fields.message.trim(), 0],
    ["Budget", fields.budget ? BUDGETS[fields.budget] : "", 1],
    ["Timeline", fields.timeline ? TIMELINES[fields.timeline] : "", 1],
    ["Name", fields.name, 2],
    ["Email", fields.email, 2],
  ];

  return (
    <form className="form onboard" onSubmit={onSubmit} noValidate aria-labelledby="onboard-step-title">
      <ol role="list" className="onboard-steps" aria-label="Progress">
        {STEPS.map((s, i) => (
          <li key={s.short} aria-current={i === step ? "step" : undefined} data-done={i < step || undefined}>
            {i <= furthest && i !== step && !sending ? (
              <button type="button" onClick={() => goTo(i)}>
                <span className="onboard-steps__num" aria-hidden="true">
                  {i + 1}
                </span>
                <span>{s.short}</span>
                <span className="visually-hidden">: go back to step {i + 1}</span>
              </button>
            ) : (
              <span>
                <span className="onboard-steps__num" aria-hidden="true">
                  {i + 1}
                </span>
                <span>{s.short}</span>
              </span>
            )}
          </li>
        ))}
      </ol>

      <div className="onboard-pane" key={step}>
        <h2 id="onboard-step-title" ref={headingRef} tabIndex={-1} className="onboard-title">
          <span className="visually-hidden">
            Step {step + 1} of {STEPS.length}:{" "}
          </span>
          {STEPS[step].title}
        </h2>

        {step === 0 && (
          <>
            <OptionCards
              name="topic"
              legend="Project type"
              choices={TOPIC_CHOICES}
              value={fields.topic}
              onChange={(v) => set("topic", v)}
              error={allErrors.topic}
            />

            {option && (
              <div className="onboard-reveal">
                {option.askSite && (
                  <div className="field">
                    <label htmlFor="contact-site">
                      Your current website <span className="optional">(optional)</span>
                    </label>
                    <input
                      id="contact-site"
                      className="input"
                      inputMode="url"
                      autoComplete="url"
                      placeholder="example.co.uk"
                      maxLength={SITE_LIMIT}
                      value={fields.site}
                      onChange={(e) => set("site", e.target.value)}
                    />
                  </div>
                )}

                <div className="field">
                  <label htmlFor="contact-message">What would you like it to achieve?</label>
                  <textarea
                    id="contact-message"
                    className="textarea"
                    rows={4}
                    required
                    maxLength={LIMITS.message}
                    placeholder="A sentence or two is plenty."
                    value={fields.message}
                    onChange={(e) => set("message", e.target.value)}
                    aria-invalid={allErrors.message ? true : undefined}
                    aria-describedby={
                      [option.examples.length ? "contact-examples" : "", describe("message") ?? ""]
                        .filter(Boolean)
                        .join(" ") || undefined
                    }
                  />
                  {option.examples.length > 0 && (
                    <div className="examples" id="contact-examples">
                      <span className="examples__label">Quick add</span>
                      {option.examples.map((ex) => (
                        <button
                          key={ex}
                          type="button"
                          className="example"
                          onClick={() => addExample(ex)}
                          disabled={fields.message.includes(ex)}
                        >
                          {ex}
                        </button>
                      ))}
                    </div>
                  )}
                  {allErrors.message && (
                    <p id="contact-message-error" className="field-error">
                      {allErrors.message}
                    </p>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {step === 1 && (
          <>
            <OptionCards
              name="budget"
              legend="Budget"
              showLegend
              compact
              choices={BUDGET_CHOICES}
              value={fields.budget}
              onChange={(v) => set("budget", v)}
              error={allErrors.budget}
            />
            <OptionCards
              name="timeline"
              legend="Timeline"
              showLegend
              compact
              choices={TIMELINE_CHOICES}
              value={fields.timeline}
              onChange={(v) => set("timeline", v)}
              error={allErrors.timeline}
            />
            <p className="field-hint">A rough idea is fine. It helps us suggest the right approach.</p>
          </>
        )}

        {step === 2 && (
          <>
            <div className="form-row">
              <div className="field">
                <label htmlFor="contact-name">Your name</label>
                <input
                  id="contact-name"
                  className="input"
                  autoComplete="name"
                  required
                  maxLength={LIMITS.name}
                  value={fields.name}
                  onChange={(e) => set("name", e.target.value)}
                  aria-invalid={allErrors.name ? true : undefined}
                  aria-describedby={describe("name")}
                />
                {allErrors.name && (
                  <p id="contact-name-error" className="field-error">
                    {allErrors.name}
                  </p>
                )}
              </div>
              <div className="field">
                <label htmlFor="contact-email">Email</label>
                <input
                  id="contact-email"
                  className="input"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  required
                  maxLength={LIMITS.email}
                  value={fields.email}
                  onChange={(e) => set("email", e.target.value)}
                  aria-invalid={allErrors.email ? true : undefined}
                  aria-describedby={describe("email")}
                />
                {allErrors.email && (
                  <p id="contact-email-error" className="field-error">
                    {allErrors.email}
                  </p>
                )}
              </div>
            </div>
            <p className="field-hint">We only use these to reply to you.</p>
          </>
        )}

        {step === REVIEW && (
          <>
            <dl className="review-list">
              {review.map(([label, value, target]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value || <span className="muted">Not given</span>}</dd>
                  <button
                    type="button"
                    className="review-list__edit"
                    onClick={() => goTo(target)}
                    disabled={sending}
                    aria-label={`Change ${label.toLowerCase()}`}
                  >
                    Change
                  </button>
                </div>
              ))}
            </dl>
            <p className="fine">
              We use your details only to reply to you. See our <Link href="/privacy">privacy notice</Link>.
            </p>
          </>
        )}
      </div>

      <div className="hp-field" aria-hidden="true">
        <label htmlFor="contact-website">Leave this field empty</label>
        <input
          id="contact-website"
          tabIndex={-1}
          autoComplete="off"
          value={fields.website}
          onChange={(e) => set("website", e.target.value)}
        />
      </div>

      <div aria-live="polite">
        {(state.status === "error" || state.status === "not_configured") && (
          <p className="form-status form-status--error" role="alert">
            {state.status === "not_configured" && <strong>Your enquiry has not been sent.</strong>}
            {state.message}
          </p>
        )}
      </div>

      <div className="onboard-nav">
        {step > 0 && (
          <button type="button" className="btn btn--secondary" onClick={() => goTo(step - 1)} disabled={sending}>
            <ArrowLeft />
            Back
          </button>
        )}
        <button type="submit" className="btn btn--primary" disabled={sending} aria-busy={sending || undefined}>
          {step < REVIEW ? (
            <>
              Continue
              <ArrowRight />
            </>
          ) : sending ? (
            "Sending…"
          ) : (
            "Send enquiry"
          )}
        </button>
      </div>
    </form>
  );
}
