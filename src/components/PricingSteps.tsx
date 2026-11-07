import { pricingSteps } from "@/lib/pricing-steps";

/**
 * How the money works, in four cards: what starts the work, what finishes it, the optional monthly cost, and what
 * happens after launch. Server-rendered, so it shows without JavaScript.
 */
export function PricingSteps() {
  const steps = pricingSteps();
  return (
    <section className="pricing-steps" aria-labelledby="pricing-steps-title">
      <p className="eyebrow">How the money works</p>
      <h2 id="pricing-steps-title" className="h2">Four things to know before you commit.</h2>
      <ol className="pricing-steps__grid" tabIndex={0} aria-label="Four things to know">
        {steps.map((step, i) => (
          <li key={step.id} className="pricing-steps__card">
            <span className="pricing-steps__count">{String(i + 1).padStart(2, "0")} / 04</span>
            <p className="pricing-steps__label">{step.label}</p>
            <p className="pricing-steps__figure">{step.figure}</p>
            <p className="pricing-steps__text">{step.text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
