"use client";

import Link from "next/link";
import { useState } from "react";
import { HOSTING_NAME, HOSTING_PLANS, WEBSITE_STATUS, type HostingErrors, type HostingPlan, type WebsiteStatus } from "@/lib/hosting-request";
import { CARE_PLANS, ONE_OFF_TIERS, WEBSITE_PLANS, formatGBP } from "@/lib/pricing";
import { DETAIL_LIMITS, EMPTY_DETAILS, type WebsiteDetails } from "@/lib/website-enquiry";
import { useEnquirySubmit } from "../useEnquirySubmit";
import styles from "./Configurator.module.css";

type Step = "plan" | "website" | "offer" | "details";

/**
 * Hosting on its own. Choose a plan, say where your website is up to, then give your details. Someone who needs a
 * website is shown the two ways we can build one before they carry on, because hosting without a website has little
 * use. Nothing is charged: the request reaches us and we send a secure link to start the plan.
 */
export function HostingRequest() {
  const [step, setStep] = useState<Step>("plan");
  const [plan, setPlan] = useState<HostingPlan | null>(null);
  const [status, setStatus] = useState<WebsiteStatus | null>(null);
  const [details, setDetails] = useState<WebsiteDetails>(EMPTY_DETAILS);
  const [errors, setErrors] = useState<HostingErrors>({});
  const [agree, setAgree] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [startedAt] = useState(() => Date.now());
  const { state, submit } = useEnquirySubmit();

  const setDetail = (key: keyof WebsiteDetails, value: string) => {
    setDetails((d) => ({ ...d, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const continueFromWebsite = () => {
    if (status) setStep(status === "need" ? "offer" : "details");
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const found: HostingErrors = {};
    if (details.name.trim().length < 2) found.name = "Please tell us your name.";
    if (details.businessName.trim().length < 2) found.businessName = "Please tell us your business name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(details.email.trim())) found.email = "Please enter a valid email address.";
    if (status === "have" && !details.existingWebsite.trim()) found.existingWebsite = "Please add your website address so we can connect your hosting.";
    if (!agree) found.agree = "Please agree to the terms before you pay.";
    if (Object.keys(found).length) {
      setErrors(found);
      return;
    }
    const result = await submit({ kind: "hosting", plan, status, details, agree, website: honeypot, startedAt });
    if (result?.status === "error" && result.fields) setErrors(result.fields as HostingErrors);
    // Straight on to Stripe's secure page. If it couldn't be opened, the page below says a link is on its way.
    if (result?.status === "success" && result.pay?.url) {
      setRedirecting(true);
      window.location.assign(result.pay.url);
    }
  };

  if (redirecting) {
    return (
      <div className={styles.done}>
        <div className="card card--raised stack" style={{ "--stack": "var(--space-4)" } as React.CSSProperties}>
          <h2 className="h2" role="status">Taking you to our secure payment page…</h2>
          <p className="muted">Payments are taken by Stripe. If nothing happens, check your connection and try again.</p>
        </div>
      </div>
    );
  }

  if (state.status === "success" && plan) {
    // The same confirmation look as the payment screen after Stripe, so the whole journey reads as one.
    const first = details.name.trim().split(/\s+/)[0];
    return (
      <div className="pc" data-stage="done">
        <div className="pc__head">
          <svg className="pc__badge" width="96" height="96" viewBox="0 0 96 96" fill="none" aria-hidden="true">
            <circle className="pc__ring-track" cx="48" cy="48" r="44" />
            <circle className="pc__ring" cx="48" cy="48" r="44" />
            <path className="pc__tick" d="M30 49.5 42.5 62 67 36" />
          </svg>
          <p className="pc__status" role="status" aria-live="polite">Request received</p>
          <h1 className="pc__title" tabIndex={-1} ref={(el) => el?.focus()}>Thank you, {first}.</h1>
        </div>

        <section className="pc__card pc__reveal" aria-labelledby="hosting-number-label">
          <div className="pc__number-row">
            <div>
              <p className="pc__label" id="hosting-number-label">Confirmation number</p>
              <p className="pc__number">{state.reference}</p>
            </div>
          </div>
          <dl className="pc__rows">
            <div>
              <dt>Plan</dt>
              <dd>{HOSTING_NAME[plan]}, {formatGBP(CARE_PLANS[plan].monthly)} a month</dd>
            </div>
            <div>
              <dt>Sent to</dt>
              <dd>{details.email}</dd>
            </div>
          </dl>
        </section>

        <section className="pc__next pc__reveal" aria-labelledby="hosting-next-title">
          <h2 id="hosting-next-title" className="pc__next-title">What happens next</h2>
          <ol className="pc__steps">
            <li>
              <strong>{state.paymentStarted ? "Use your secure link" : "Check your inbox"}</strong>
              <p>
                {state.paymentStarted
                  ? <>We couldn&apos;t open the payment page just now, so we&apos;ve emailed a link to finish your plan. Nothing is charged until you use it.</>
                  : <>We&apos;ll reply within one working day with a secure link to start your plan. Nothing is charged until you use it.</>}
              </p>
            </li>
            <li>
              <strong>We connect your hosting</strong>
              <p>Once your plan is started, we connect it to your website and confirm by email.</p>
            </li>
            <li>
              <strong>Manage your plan</strong>
              <p>Sign in to your account with this email address to see your plan and billing at any time.</p>
            </li>
          </ol>
        </section>

        <div className="pc__actions pc__reveal">
          <Link href="/website-projects" className="btn btn--primary">Back to services</Link>
          <Link href="/work" className="pc__home">See our work</Link>
        </div>
        <p className="fine pc__reveal">
          Questions? Reply to your email or <Link href="/contact">contact us</Link> and quote {state.reference}.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.done}>
      <div className="card card--raised stack form" style={{ "--stack": "var(--space-5)" } as React.CSSProperties}>
        {step === "plan" && (
          <>
            <div>
              <p className="eyebrow">Hosting only</p>
              <h2 className="h2">Choose your hosting</h2>
              <p className="muted">Rolling monthly, with 30 days&apos; notice to end. Nothing to pay yet.</p>
            </div>
            <fieldset className={styles.group}>
              <legend className="visually-hidden">Hosting plan</legend>
              <div className={styles.choices}>
                {HOSTING_PLANS.map((id) => (
                  <label key={id} className={styles.choice}>
                    <input type="radio" name="hosting-plan" checked={plan === id} onChange={() => setPlan(id)} />
                    <span className={styles.choiceBody}>
                      <span className={styles.choiceLabel}>{CARE_PLANS[id].label}</span>
                      <span className={styles.choicePrice}>{formatGBP(CARE_PLANS[id].monthly)} a month</span>
                      <span className={styles.choiceHint}>{CARE_PLANS[id].summary}</span>
                      <ul className="cfg-includes" role="list">
                        {CARE_PLANS[id].includes.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="btn-row">
              <button type="button" className="btn btn--primary" disabled={!plan} onClick={() => setStep("website")}>
                {plan ? `Continue with ${CARE_PLANS[plan].label}` : "Choose a plan to continue"}
              </button>
            </div>
          </>
        )}

        {step === "website" && (
          <>
            <div>
              <p className="eyebrow">{plan ? `${CARE_PLANS[plan].label}, ${formatGBP(CARE_PLANS[plan].monthly)} a month` : "Hosting only"}</p>
              <h2 className="h2">Do you have a website?</h2>
              <p className="muted">So we know what to connect your hosting to.</p>
            </div>
            <fieldset className={styles.group}>
              <legend className="visually-hidden">Where your website is up to</legend>
              <div className={styles.choices}>
                {(Object.keys(WEBSITE_STATUS) as WebsiteStatus[]).map((id) => (
                  <label key={id} className={styles.choice}>
                    <input type="radio" name="website-status" checked={status === id} onChange={() => setStatus(id)} />
                    <span className={styles.choiceBody}>
                      <span className={styles.choiceLabel}>{WEBSITE_STATUS[id]}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="btn-row">
              <button type="button" className="btn btn--primary" disabled={!status} onClick={continueFromWebsite}>
                Continue
              </button>
              <button type="button" className="btn btn--secondary" onClick={() => setStep("plan")}>
                Back
              </button>
            </div>
          </>
        )}

        {step === "offer" && (
          <>
            <div>
              <p className="eyebrow">You need a website</p>
              <h2 className="h2">We can build it too</h2>
              <p className="muted">Hosting keeps a website online, so most people start with the website. Two ways to do it:</p>
            </div>
            <div className="stack" style={{ "--stack": "var(--space-4)" } as React.CSSProperties}>
              <div className={`${styles.choice} cfg-static`}>
                <span className={styles.choiceBody}>
                  <span className={styles.choiceLabel}>Own your website</span>
                  <span className={styles.choicePrice}>From {formatGBP(ONE_OFF_TIERS.essential.from)}</span>
                  <span className={styles.choiceHint}>A bespoke website, yours on full payment. Add hosting in the same step.</span>
                  <Link href="/website-projects" className="btn btn--primary">
                    See website tiers
                  </Link>
                </span>
              </div>
              <div className={`${styles.choice} cfg-static`}>
                <span className={styles.choiceBody}>
                  <span className={styles.choiceLabel}>A managed website</span>
                  <span className={styles.choicePrice}>From {formatGBP(WEBSITE_PLANS.bronze.monthly)} a month</span>
                  <span className={styles.choiceHint}>Design, hosting, maintenance and updates in one monthly price. No minimum term.</span>
                  <Link href="/pricing#plans" className="btn btn--secondary">
                    See the plans
                  </Link>
                </span>
              </div>
            </div>
            <div className="btn-row">
              <button type="button" className="btn btn--secondary" onClick={() => setStep("details")}>
                Continue with hosting only
              </button>
              <button type="button" className="btn btn--secondary" onClick={() => setStep("website")}>
                Back
              </button>
            </div>
          </>
        )}

        {step === "details" && plan && status && (
          <form onSubmit={onSubmit} noValidate className="stack" style={{ "--stack": "var(--space-5)" } as React.CSSProperties}>
            <div>
              <p className="eyebrow">{CARE_PLANS[plan].label}, {formatGBP(CARE_PLANS[plan].monthly)} a month</p>
              <h2 className="h2">Your details</h2>
              <p className="muted">Next you pay securely through Stripe. Nothing is charged until you do.</p>
            </div>
            <TextField id="name" label="Your name" value={details.name} error={errors.name} onChange={(v) => setDetail("name", v)} autoComplete="name" />
            <TextField id="businessName" label="Business name" value={details.businessName} error={errors.businessName} onChange={(v) => setDetail("businessName", v)} autoComplete="organization" />
            <TextField id="email" label="Email" type="email" value={details.email} error={errors.email} onChange={(v) => setDetail("email", v)} autoComplete="email" />
            <TextField id="phone" label="Phone (optional)" type="tel" optional value={details.phone} error={errors.phone} onChange={(v) => setDetail("phone", v)} autoComplete="tel" />
            {status === "have" && (
              <TextField id="existingWebsite" label="Your website address" value={details.existingWebsite} error={errors.existingWebsite} onChange={(v) => setDetail("existingWebsite", v)} placeholder="yourbusiness.co.uk" inputMode="url" />
            )}

            <div className={styles.pay}>
              <p className="eyebrow">First payment</p>
              <p className={styles.payAmount}>{formatGBP(CARE_PLANS[plan].monthly)}</p>
              <p className="muted">Your first month. Then {formatGBP(CARE_PLANS[plan].monthly)} a month, taken automatically. Rolling monthly, with 30 days&apos; notice to end.</p>
              <fieldset className="pay-agree">
                <legend className="eyebrow">Before you pay</legend>
                <label className="sub-agree">
                  <input type="checkbox" checked={agree} onChange={(e) => (setAgree(e.target.checked), setErrors((x) => ({ ...x, agree: undefined })))} aria-invalid={errors.agree ? true : undefined} />
                  <span>
                    I agree to the{" "}
                    <Link href="/terms" target="_blank">
                      terms
                    </Link>
                    .
                  </span>
                </label>
                {errors.agree && (
                  <p className="field-error" role="alert">
                    {errors.agree}
                  </p>
                )}
              </fieldset>
            </div>

            <div className="visually-hidden" aria-hidden="true">
              <label htmlFor="hosting-website">Leave this field empty</label>
              <input id="hosting-website" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
            </div>
            {state.status === "error" && !state.fields && (
              <p className="field-error" role="alert">
                {state.message} <Link href="/contact">Send us a message instead</Link>.
              </p>
            )}
            {state.status === "not_configured" && (
              <p className="field-error" role="alert">
                {state.message} <Link href="/contact">Send us a message instead</Link>.
              </p>
            )}
            <div className="btn-row">
              <button type="submit" className="btn btn--primary" disabled={state.status === "submitting"}>
                {state.status === "submitting" ? "Opening payment…" : `Continue to payment, ${formatGBP(CARE_PLANS[plan].monthly)}`}
              </button>
              <button type="button" className="btn btn--secondary" onClick={() => setStep(status === "need" ? "offer" : "website")}>
                Back
              </button>
            </div>
          </form>
        )}
      </div>
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
  optional,
  placeholder,
  inputMode,
}: {
  id: keyof WebsiteDetails;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  type?: string;
  autoComplete?: string;
  optional?: boolean;
  placeholder?: string;
  inputMode?: "url";
}) {
  const fieldId = `hosting-${id}`;
  return (
    <div className="field">
      <label htmlFor={fieldId}>{label}</label>
      <input
        id={fieldId}
        className="input"
        type={type}
        maxLength={DETAIL_LIMITS[id]}
        autoComplete={autoComplete}
        placeholder={placeholder}
        inputMode={inputMode}
        required={!optional}
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
