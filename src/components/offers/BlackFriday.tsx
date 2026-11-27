"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BLACK_FRIDAY, FIRST_BILL_DAY, MOTTO, OFFER_HEADLINE, afterTrialLine } from "@/lib/black-friday";
import { WEBSITE_PLANS, formatGBP } from "@/lib/pricing";
import { useBlackFriday } from "./useBlackFriday";

/** Pages where the strip would get in the way: signed-in areas, checkout, payment pages and customers' own sites. */
const HIDDEN_UNDER = ["/account", "/admin", "/build", "/subscribe", "/site-preview", "/preview", "/sites", "/e2e-"];
const hiddenOn = (pathname: string) => HIDDEN_UNDER.some((p) => pathname === p || pathname.startsWith(p.endsWith("-") ? p : `${p}/`));

/** The slim Black Friday strip at the top of the public pages. Shows only while the offer is on. */
export function BlackFridayStrip() {
  const pathname = usePathname() ?? "";
  const active = useBlackFriday();
  if (!active || hiddenOn(pathname)) return null;
  return (
    <aside className="bf-strip inverse" aria-label="Black Friday offer" data-offer={BLACK_FRIDAY.code}>
      <div className="container container--wide bf-strip__inner">
        <p className="bf-strip__label">Black Friday</p>
        <p className="bf-strip__text">
          <strong>{OFFER_HEADLINE}</strong> <span className="bf-strip__then">{afterTrialLine(null)}</span>{" "}
          <span className="bf-strip__ends">Sign up by {BLACK_FRIDAY.endsLabel}.</span>
        </p>
        <Link href="/pricing#black-friday" className="bf-strip__link">
          How it works
        </Link>
      </div>
    </aside>
  );
}

/** The offer on each plan card while it is on: the headline, then the plan's price after the trial and the cancel-free line. */
export function PlanOfferBadge({ monthly }: { monthly: number }) {
  const active = useBlackFriday();
  if (!active) return null;
  return (
    <div className="pkg-card__offer">
      <span className="tag tag--accent">{OFFER_HEADLINE}</span>
      <span className="pkg-card__offer-then">{afterTrialLine(monthly)}</span>
    </div>
  );
}

const core = WEBSITE_PLANS.bronze;
const plus = WEBSITE_PLANS.silver;
const pro = WEBSITE_PLANS.gold;

/** The short terms of the offer, as questions. Each is a <details>, so it reads without JavaScript once shown. */
export const BLACK_FRIDAY_FAQ: { q: string; a: string }[] = [
  {
    q: "What do I get?",
    a: `A bespoke website, free for ${BLACK_FRIDAY.trialDays} days, on any WINJO plan: ${core.name} at ${formatGBP(core.monthly)}, ${plus.name} at ${formatGBP(plus.monthly)} or ${pro.name} at ${formatGBP(pro.monthly)} a month, with hosting and updates included. No large upfront cost.`,
  },
  {
    q: "When am I charged?",
    a: `We take your card when you sign up, through Stripe, and nothing is charged for ${BLACK_FRIDAY.trialDays} days. Your first monthly payment is taken on day ${FIRST_BILL_DAY}, then each month after that. We email you a reminder 3 days before.`,
  },
  {
    q: "Can I cancel during the trial?",
    a: `Yes. Cancel before day ${FIRST_BILL_DAY} and you pay nothing. Sign in to your account, open Plan and billing and choose Request cancellation, or reply to any of our emails. Your plan then ends when the trial does and your card is never charged.`,
  },
  {
    q: "Is there a minimum term?",
    a: "No. Once billing starts, your plan is rolling monthly, like all our plans. Cancel any time.",
  },
  {
    q: "Where will I see my website during the trial?",
    a: "On a private preview link hosted by WINJO. Your website goes on your own domain, and files are handed over, only once your billing has started.",
  },
  {
    q: "Who owns the design?",
    a: "Your design is licensed to you while your plan is active. Your domain name and the content you give us stay yours.",
  },
  {
    q: "When does the offer end?",
    a: `Sign up by ${BLACK_FRIDAY.endsLabel}. After that, our plans are on their standard terms.`,
  },
];

/** The offer's section on the pricing page: the motto, the plain terms and one action. */
export function BlackFridayTerms() {
  const active = useBlackFriday();
  if (!active) return null;
  return (
    <section id="black-friday" className="section--tight bf-terms" aria-labelledby="bf-terms-title">
      <div className="container container--wide">
        <div className="bf-terms__head">
          <p className="eyebrow">Black Friday</p>
          <h2 id="bf-terms-title" className="h2">
            FREE bespoke website <span className="serif-em">for {BLACK_FRIDAY.trialDays} days.</span>
          </h2>
          <p className="bf-terms__then">{afterTrialLine(core.monthly)}</p>
          <p className="lede">{MOTTO}</p>
        </div>
        <div className="faq bf-terms__list">
          {BLACK_FRIDAY_FAQ.map((item) => (
            <details key={item.q} className="faq__item">
              <summary>
                <span className="faq__short">{item.q}</span>
                <span className="faq__more">
                  Answer <span className="faq__icon" aria-hidden="true" />
                </span>
              </summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
        <div className="btn-row mt-5">
          <Link href="#plans" className="btn btn--primary">
            Choose a plan
          </Link>
        </div>
      </div>
    </section>
  );
}
