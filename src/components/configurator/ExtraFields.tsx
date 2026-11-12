"use client";

import { useId } from "react";
import { BUDGETS, TIMELINES } from "@/lib/enquiry";
import {
  EXTRA_LIMITS,
  JOURNEYS,
  LEGAL,
  MEASURES,
  PHOTO_STYLES,
  PRICING_STYLES,
  ROLES,
  EMPTY_EXTRAS,
  type BriefExtras,
  type Journey,
  type LegalPage,
  type Measure,
  type PhotoStyle,
  type PricingStyle,
  type Role,
} from "@/lib/brief-extras";
import type { WebsiteBrief } from "@/lib/website-brief";
import type { BriefChange } from "./BriefSteps";
import styles from "./Configurator.module.css";

type TextKey = "mainService" | "dontDo" | "existingPages" | "mustFind" | "wordsUse" | "wordsAvoid" | "accessibility" | "socials" | "reviews";

/**
 * The extra questions, shown on the step they belong to. Each has a plain hint with an example. All are optional.
 */
export function ExtraFields({ step, brief, onChange, bespoke = false }: { step: string; brief: WebsiteBrief; onChange: BriefChange; bespoke?: boolean }) {
  const id = useId();
  // Show exactly what the customer typed (spaces included). The text is trimmed when it is saved, not while they type.
  const e: BriefExtras = { ...EMPTY_EXTRAS, ...brief.extras };
  const set = (patch: Partial<BriefExtras>) => onChange({ extras: { ...e, ...patch } });

  const chips = <K extends string>(options: Record<K, string>, value: K | "", onPick: (v: K | "") => void, label: string) => (
    <div className="brief-chips" role="group" aria-label={label}>
      {(Object.keys(options) as K[]).map((k) => (
        <button key={k} type="button" className="brief-chip" aria-pressed={value === k} onClick={() => onPick(value === k ? "" : k)}>
          {options[k]}
        </button>
      ))}
    </div>
  );

  const many = <K extends string>(options: Record<K, string>, value: K[], onToggle: (v: K[]) => void, label: string) => (
    <div className="brief-chips" role="group" aria-label={label}>
      {(Object.keys(options) as K[]).map((k) => (
        <button
          key={k}
          type="button"
          className="brief-chip"
          aria-pressed={value.includes(k)}
          onClick={() => onToggle(value.includes(k) ? value.filter((x) => x !== k) : [...value, k])}
        >
          {options[k]}
        </button>
      ))}
    </div>
  );

  const text = (key: TextKey, label: string, hint: string, multiline: boolean, max: number) => (
    <div className="field" key={key}>
      <label htmlFor={`${id}-${key}`}>
        {label} <span className="optional">(optional)</span>
      </label>
      <p className="field-hint">{hint}</p>
      {multiline ? (
        <textarea id={`${id}-${key}`} className="textarea" rows={3} maxLength={max} value={e[key]} onChange={(ev) => set({ [key]: ev.target.value } as Partial<BriefExtras>)} />
      ) : (
        <input id={`${id}-${key}`} className="input" maxLength={max} value={e[key]} onChange={(ev) => set({ [key]: ev.target.value } as Partial<BriefExtras>)} />
      )}
    </div>
  );

  const group = (label: string, hint: string, control: React.ReactNode) => (
    <fieldset className={styles.group}>
      <legend className={styles.legend}>
        {label} <span className="optional">(optional)</span>
      </legend>
      <p className="field-hint">{hint}</p>
      {control}
    </fieldset>
  );

  if (step === "about") {
    return (
      <div className="site-profile">
        {group(
          "What is your role in the business?",
          "This tells us who the site speaks for. For example: owner, or a manager who looks after bookings.",
          chips(ROLES, e.role, (v: Role | "") => set({ role: v }), "Role"),
        )}
      </div>
    );
  }

  if (step === "offer") {
    return (
      <div className="site-profile">
        {text("mainService", "Which service should the site lead with?", "If you offer several things, which one should come first? For example: airport transfers.", false, EXTRA_LIMITS.short)}
        {group(
          "How do you price your work?",
          "Fixed prices, quotes on request, or a mix. This shapes how the pricing is shown.",
          chips(PRICING_STYLES, e.pricingStyle, (v: PricingStyle | "") => set({ pricingStyle: v }), "Pricing"),
        )}
        {group(
          "How do customers usually first get in touch?",
          "Pick the one that happens most often.",
          chips(JOURNEYS, e.customerJourney, (v: Journey | "") => set({ customerJourney: v }), "First contact"),
        )}
        {text("dontDo", "What don't you offer?", "So the site doesn't promise it. For example: \"We don't do weddings\".", true, EXTRA_LIMITS.text)}
      </div>
    );
  }

  if (step === "goals") {
    return (
      <div className="site-profile">
        {bespoke && (
          <>
            {group("What is your budget?", "A rough range is fine. We use it to quote something that fits.", chips(BUDGETS, e.budget, (v) => set({ budget: v }), "Budget"))}
            {group("When would you like it by?", "So we can plan the build around your date.", chips(TIMELINES, e.deadline, (v) => set({ deadline: v }), "Deadline"))}
          </>
        )}
        {group(
          "How will you know the website is working?",
          "Pick any that apply. We use this to choose what to put first.",
          many(MEASURES, e.measures, (v: Measure[]) => set({ measures: v }), "Measures"),
        )}
        {text("existingPages", "Which pages do you already have?", "So we keep what works. For example: a menu PDF, or a link to a price list.", false, EXTRA_LIMITS.text)}
        {text("mustFind", "What must visitors be able to find?", "Anything that must be easy to find. For example: the menu, a map, or your prices.", true, EXTRA_LIMITS.text)}
      </div>
    );
  }

  if (step === "look") {
    return (
      <div className="site-profile">
        {group(
          "What kind of photos will you use?",
          "Your own photos, stock photos, or a mix.",
          chips(PHOTO_STYLES, e.photoStyle, (v: PhotoStyle | "") => set({ photoStyle: v }), "Photos"),
        )}
        {text("wordsUse", "Which words suit your business?", "Words or phrases that describe you. For example: \"friendly\", \"no-fuss\", \"local\".", false, EXTRA_LIMITS.text)}
        {text("wordsAvoid", "Which words should we avoid?", "Words to keep out of the site. For example: \"cheap\".", false, EXTRA_LIMITS.text)}
        {text("accessibility", "Are there accessibility needs?", "Anything that helps people read or use the site, such as larger text or simpler language.", true, EXTRA_LIMITS.text)}
      </div>
    );
  }

  if (step === "files") {
    return (
      <div className="site-profile">
        {text("socials", "Where else are you online?", "Links to your social media, or your Google Business Profile.", true, EXTRA_LIMITS.long)}
        {text("reviews", "Which reviews can we show?", "Only reviews the customer has agreed can be shown. Paste them, or say which ones.", true, EXTRA_LIMITS.long)}
        {group(
          "Which legal pages do you need?",
          "Pick any that apply, or leave blank if you're not sure. We can add them later.",
          many(LEGAL, e.legal, (v: LegalPage[]) => set({ legal: v }), "Legal pages"),
        )}
      </div>
    );
  }

  return null;
}
