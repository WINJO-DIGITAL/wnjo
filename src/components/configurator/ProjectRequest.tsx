"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { BUDGETS, TIMELINES, type Budget, type Timeline } from "@/lib/enquiry";
import { NOTES_LIMIT, type ProjectErrors } from "@/lib/project-request";
import { ONE_OFF_WEBSITE, formatGBP } from "@/lib/pricing";
import { EMPTY_BRIEF, type WebsiteBrief } from "@/lib/website-brief";
import { DETAIL_LIMITS, EMPTY_DETAILS, type WebsiteDetails } from "@/lib/website-enquiry";
import { GoalsField } from "./BriefSteps";
import { useEnquirySubmit } from "../useEnquirySubmit";
import styles from "./Configurator.module.css";

/**
 * Buy a website outright: a short request, not the managed-plan steps. Goals, a budget and a deadline, then a written
 * proposal by email and in the account. The deposit (50%) is taken only after the proposal is accepted.
 */
export function ProjectRequest({ pages, care }: { pages?: string; care?: string }) {
  const [details, setDetails] = useState<WebsiteDetails>(EMPTY_DETAILS);
  const [brief, setBrief] = useState<WebsiteBrief>(EMPTY_BRIEF);
  const [budget, setBudget] = useState<Budget | null>(null);
  const [timeline, setTimeline] = useState<Timeline | null>(null);
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<ProjectErrors>({});
  const [honeypot, setHoneypot] = useState("");
  const [startedAt] = useState(() => Date.now());
  const { state, submit } = useEnquirySubmit();

  const setDetail = (key: keyof WebsiteDetails, value: string) => {
    setDetails((d) => ({ ...d, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const found: ProjectErrors = {};
    if (details.name.trim().length < 2) found.name = "Please tell us your name.";
    if (details.businessName.trim().length < 2) found.businessName = "Please tell us your business name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(details.email.trim())) found.email = "Please enter a valid email address.";
    if (brief.goals.length === 0) found.goals = "Choose at least one goal.";
    if (!budget) found.budget = "Choose a budget, or Not sure yet.";
    if (!timeline) found.timeline = "Choose when you'd like it by.";
    if (Object.keys(found).length) {
      setErrors(found);
      return;
    }
    const result = await submit({ kind: "project", pages, care, details, goals: brief.goals, budget, timeline, notes, website: honeypot, startedAt });
    if (result?.status === "error" && result.fields) setErrors(result.fields as ProjectErrors);
  };

  if (state.status === "success") {
    return (
      <div className={styles.done}>
        <div className="card card--raised stack" style={{ "--stack": "var(--space-5)" } as React.CSSProperties}>
          <h2 className="h2" tabIndex={-1} ref={(el) => el?.focus()}>
            Thank you, {details.name.trim().split(/\s+/)[0]}.
          </h2>
          <p className="muted">
            We&apos;ll email <strong>{details.email}</strong> a written proposal within one working day. Nothing is charged until you accept it.
            Your reference is <strong>{state.reference}</strong>.
          </p>
          <div className="btn-row">
            {state.tracked && (
              <Link href="/account" className="btn btn--primary">
                Track my website
              </Link>
            )}
            <Link href="/work" className="btn btn--secondary">
              See our work
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.done}>
      <form onSubmit={onSubmit} noValidate className="card card--raised stack form" style={{ "--stack": "var(--space-5)" } as React.CSSProperties}>
        <div>
          <p className="eyebrow">{ONE_OFF_WEBSITE.name}</p>
          <h2 className="h2">From {formatGBP(ONE_OFF_WEBSITE.from)}</h2>
          <p className="muted">Yours on full payment. A 50% deposit starts the build, after you&apos;ve accepted the proposal.</p>
        </div>

        <TextField id="name" label="Your name" value={details.name} error={errors.name} onChange={(v) => setDetail("name", v)} autoComplete="name" />
        <TextField id="businessName" label="Business name" value={details.businessName} error={errors.businessName} onChange={(v) => setDetail("businessName", v)} autoComplete="organization" />
        <TextField id="email" label="Email" type="email" value={details.email} error={errors.email} onChange={(v) => setDetail("email", v)} autoComplete="email" />

        <GoalsField brief={brief} onChange={(p) => setBrief((b) => ({ ...b, ...(typeof p === "function" ? p(b) : p) }))} error={errors.goals} />

        <Choices legend="Budget" options={BUDGETS} value={budget} error={errors.budget} onChange={(v) => { setBudget(v); setErrors((e) => ({ ...e, budget: undefined })); }} />
        <Choices legend="When would you like it?" options={TIMELINES} value={timeline} error={errors.timeline} onChange={(v) => { setTimeline(v); setErrors((e) => ({ ...e, timeline: undefined })); }} />

        <div className="field">
          <label htmlFor="project-notes">
            Anything else? <span className="optional">(optional)</span>
          </label>
          <textarea id="project-notes" className="textarea" rows={3} maxLength={NOTES_LIMIT} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <div className="visually-hidden" aria-hidden="true">
          <label htmlFor="project-website">Leave this field empty</label>
          <input id="project-website" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
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
        <div className="btn-row">
          <button type="submit" className="btn btn--primary" disabled={state.status === "submitting"}>
            {state.status === "submitting" ? "Sending…" : "Get my proposal"}
          </button>
          <Link href="/contact?topic=website" className="btn btn--secondary">
            Talk to us first
          </Link>
        </div>
      </form>
    </div>
  );
}

function TextField({
  id,
  label,
  value,
  onChange,
  error,
  type = "text",
  autoComplete,
}: {
  id: keyof WebsiteDetails;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  type?: string;
  autoComplete?: string;
}) {
  const fieldId = `project-${id}`;
  return (
    <div className="field">
      <label htmlFor={fieldId}>{label}</label>
      <input
        id={fieldId}
        className="input"
        type={type}
        maxLength={DETAIL_LIMITS[id]}
        autoComplete={autoComplete}
        required
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${fieldId}-error` : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {error && (
        <p id={`${fieldId}-error`} className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}

function Choices<K extends string>({
  legend,
  options,
  value,
  onChange,
  error,
}: {
  legend: string;
  options: Record<K, string>;
  value: K | null;
  onChange: (value: K) => void;
  error?: string;
}) {
  const id = useId();
  return (
    <fieldset className={styles.group}>
      <legend className={styles.legend}>{legend}</legend>
      <div className={styles.choices}>
        {(Object.keys(options) as K[]).map((key) => (
          <label key={key} className={styles.choice}>
            <input type="radio" name={`${id}-choice`} checked={value === key} onChange={() => onChange(key)} />
            <span className={styles.choiceBody}>
              <span className={styles.choiceLabel}>{options[key]}</span>
            </span>
          </label>
        ))}
      </div>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
    </fieldset>
  );
}
