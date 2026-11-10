import { PageHero } from "@/components/Blocks";
import { pageMetadata } from "@/lib/metadata";
import { LegalDraftNotice } from "@/components/pricing/WebsitePackages";
import { CARE_PLANS, DAY_RATE, REFRESH, SUBSCRIPTION_TERMS, WEBSITE_PLANS, formatGBP } from "@/lib/pricing";
import { QUOTE_TERMS_VERSION } from "@/lib/terms";
import { site } from "@/lib/site";

export const metadata = pageMetadata(
  "/terms",
  "Terms and conditions",
  "The terms that apply to managed website subscriptions, quotes, deposits, balances and work with WINJO DIGITAL.",
);

const { bronze: core, silver: pro, gold: plus } = WEBSITE_PLANS;
const minutes = (m: number) => (m >= 60 ? `${m / 60} hour${m === 60 ? "" : "s"}` : `${m} minutes`);

/*
 * Version 2026-11-10.3 (see lib/terms). Drafted for WINJO DIGITAL, a sole trader in England, selling to businesses and
 * to consumers. The business decisions in it (notice, change allowances, handover, reply times) are the defaults in
 * lib/pricing SUBSCRIPTION_TERMS. It is a draft and has NOT been reviewed by a solicitor. Keep the draft notice on
 * until one has checked it; then set LEGAL_REVIEW_PENDING to false in lib/pricing.
 */
export default function TermsPage() {
  return (
    <>
      <PageHero eyebrow="Legal" title="Terms and conditions." lede="The terms that apply when you work with us." />
      <section className="section--tight" style={{ paddingTop: 0 }}>
        <div className="container container--wide">
          <div className="prose">
            <LegalDraftNotice />
            <p className="fine">Version {QUOTE_TERMS_VERSION}. Last updated 10 November 2026.</p>

            <h2>1. Who we are and who these terms cover</h2>
            <p>
              These terms are between you and {site.name}, a sole trader business based at 3 Knoxwood Close,
              Thornton-Cleveleys, FY5 3UP (&ldquo;we&rdquo;, &ldquo;us&rdquo;). They apply to managed website
              subscriptions, website projects and any other work we agree with you. You can contact us through the contact
              page on our website. Where a right applies only to consumers (people buying for purposes outside their
              business), we say so.
            </p>

            <h2>2. Quotes and proposals</h2>
            <p>
              Your quote is based on the answers you give us. It is valid for 30 days from the date it is sent. Our written
              proposal sets out the plan or project, the price, what is included, the payment schedule and any extra work
              that is not included. Nothing is charged until you agree to go ahead. If the work changes from what you
              described, we will tell you before it goes ahead and quote again if needed.
            </p>

            <h2>3. Managed website subscriptions</h2>
            <p>
              A managed website subscription ({core.name}, {pro.name} or {plus.name}) covers the design and build of your
              website, managed hosting, security monitoring, backups, technical maintenance, support and the other services
              listed for your plan on our pricing page and in your proposal.
            </p>
            <p>
              The prices are {formatGBP(core.monthly)} a month for {core.name}, {formatGBP(pro.monthly)} a month for{" "}
              {pro.name} and {formatGBP(plus.monthly)} a month for {plus.name}. There is no setup fee. Payments are taken
              monthly in advance, through Stripe, starting with your first payment when you agree to go ahead. WINJO
              DIGITAL is not VAT registered, so no VAT is charged.
            </p>
            <p>
              Subscriptions are rolling monthly. There is no minimum contract term. Your subscription continues until you
              or we end it under section 8.
            </p>

            <h2>4. Changes, support and response times</h2>
            <p>
              Each plan includes a monthly allowance for small changes to your website: {core.name} up to{" "}
              {minutes(SUBSCRIPTION_TERMS.changeMinutes.bronze)}, {pro.name} up to{" "}
              {minutes(SUBSCRIPTION_TERMS.changeMinutes.silver)} and {plus.name} up to{" "}
              {minutes(SUBSCRIPTION_TERMS.changeMinutes.gold)}. The allowance is used in each calendar month and does not
              carry over to the next month.
            </p>
            <p>
              Any work beyond the allowance, and any new page, feature or integration, is quoted in writing before we start
              it, at {formatGBP(DAY_RATE)} a day unless we agree otherwise.
            </p>
            <p>
              We reply to support messages within {SUBSCRIPTION_TERMS.replyWorkingDays.bronze} working days on{" "}
              {core.name} and within {SUBSCRIPTION_TERMS.replyWorkingDays.silver} working day on {pro.name} and{" "}
              {plus.name}. We monitor your website and work to fix faults as quickly as we reasonably can. We do not promise
              a particular percentage of uptime, because hosting depends partly on third-party providers.
            </p>

            <h2>5. Winjo Refresh</h2>
            <p>
              {pro.name} and {plus.name} include Winjo Refresh: a planned refresh of your website&apos;s design and
              experience every {REFRESH.everyMonths} months, counted from the start of your subscription. We will agree the
              date with you at least 30 days in advance.
            </p>
            <p>
              A refresh covers the visual design and experience of your existing pages, and reflects changes in your
              business, within the scope written in your proposal. It does not include unlimited redevelopment or an
              unlimited number of new pages or features. Those are quoted separately. The refresh is included in your
              monthly price and has no separate charge. It cannot be taken as a cash payment or transferred to another
              website.
            </p>

            <h2>6. Price changes and changing plan</h2>
            <p>
              We will give you at least {SUBSCRIPTION_TERMS.priceChangeNoticeDays} days&apos; written notice of any change to
              your monthly price. If you do not want to accept it, you can end your subscription before the change takes
              effect without paying a fee.
            </p>
            <p>
              You can change plan at any time by telling us. The new plan and its price apply from your next monthly
              payment. We will not charge or refund part of a month when a plan changes.
            </p>

            <h2>7. Payment failures</h2>
            <p>
              If a payment fails, we will tell you, and Stripe will try the payment again over the following days. If it is
              still unpaid 14 days after we first told you, we may suspend your website. We will not delete it. If it is
              still unpaid 30 days after that, we may end your subscription under section 8, and section 8.3 then applies.
            </p>

            <h2>8. Ending your subscription</h2>
            <p>
              <strong>8.1 Ending it yourself.</strong> You can end your subscription at any time by giving us{" "}
              {SUBSCRIPTION_TERMS.noticeDays} days&apos; written notice by email or through the contact page. There is no
              cancellation fee. Your subscription runs to the end of the notice period, and we do not take any payment after
              it ends.
            </p>
            <p>
              <strong>8.2 Changing your mind in the first 14 days.</strong> If you are a consumer, you can cancel the
              contract within 14 days of the day you agree to go ahead, without giving a reason. We will refund everything
              you have paid within 14 days of hearing from you. If you ask us to start work within those 14 days, you must
              say so clearly when you agree. If you then cancel, you pay only for the work we have already done, in
              proportion to the total price, and we refund the rest. If you did not ask us to start, you pay nothing for
              work done in those 14 days.
            </p>
            <p>
              <strong>8.3 What happens when a subscription ends.</strong> Whoever ends it, we will:
            </p>
            <ul>
              <li>
                keep your website live free of charge for up to {SUBSCRIPTION_TERMS.liveAfterEndDays} days after the end
                date, if you ask, so you can arrange a move without downtime;
              </li>
              <li>
                send you a copy of your content (your text, images and other material you supplied), and a copy of the
                design files and page layouts for your website, within {SUBSCRIPTION_TERMS.handoverDays} days of your
                request;
              </li>
              <li>
                help you point your domain name to a new host, at no charge, with one follow-up if needed; and
              </li>
              <li>
                not delete your website from our servers until you have confirmed you have your copy, and in any case not
                before the {SUBSCRIPTION_TERMS.liveAfterEndDays}-day period has ended.
              </li>
            </ul>
            <p>
              Our own software and framework, which we use to build and run every website, are not part of that copy. Third-party
              software and services remain under their own terms.
            </p>

            <h2>9. Ownership</h2>
            <p>
              <strong>Your domain name</strong> is yours, and it is registered in your name. We will not keep it or charge to
              transfer it.
            </p>
            <p>
              <strong>Your content</strong>, meaning the text, images, logos and other material you supply, remains yours. You
              give us permission to use it only to provide your website and the services in these terms.
            </p>
            <p>
              <strong>Our code and framework</strong> remain ours. While your subscription is active, you have the right to use
              the website we run for you. When your subscription ends, section 8.3 applies.
            </p>
            <p>
              <strong>Website projects bought outright</strong> (section 11) are yours on full payment, as set out there.
            </p>

            <h2>10. Your content and responsibilities</h2>
            <p>
              You confirm that the content you supply can be used on your website and that you have the rights to it. You
              will not ask us to publish anything unlawful or infringing. We may refuse, or remove, content that we
              reasonably believe is unlawful or infringing, and we will tell you if we do. Where we use stock imagery or
              third-party material, we say so.
            </p>
            <p>
              We do not guarantee search rankings, AI visibility or recommendations. We build and maintain your website so
              that search engines and AI tools can read it properly, but results depend on factors outside our control.
            </p>

            <h2>11. Website projects bought outright</h2>
            <p>
              For a website project, the price is set out in your proposal. When you agree to go ahead, a deposit of 50% of
              the quoted price is payable. The remaining 50% is payable once the site is ready for your final review, before
              it goes live, so you can see the finished work first. Hosting and care after launch are optional and are
              priced separately.
            </p>
            <p>
              The design and build remain ours until the final payment has cleared. We then release the finished site, its
              files and its source code to you, and copyright in the bespoke design passes to you on that full payment. Our
              own software and framework are not part of that release.
            </p>

            <h2>12. Our service standard</h2>
            <p>
              We will perform our services with reasonable care and skill, as the Consumer Rights Act 2015 requires where it
              applies. We will keep you informed about progress and about anything that affects delivery.
            </p>

            <h2>13. Liability</h2>
            <p>
              Nothing in these terms limits our liability for death or personal injury caused by our negligence, for fraud or
              fraudulent misrepresentation, or for anything else that the law does not allow us to limit.
            </p>
            <p>
              Subject to that, and to the statutory rights of consumers, our total liability to you under or in connection with
              these terms is limited to the total fees you have paid us in the 12 months before the event that gives rise to the
              claim. We are not liable for loss of profit, revenue, business or goodwill, or for any indirect or consequential
              loss.
            </p>
            <p>
              We are not responsible for outages or problems caused by third-party providers, such as hosting, payment and
              email providers, or by changes made to third-party services. We will still do what we reasonably can to put them
              right.
            </p>

            <h2>14. Complaints</h2>
            <p>
              If something goes wrong, please tell us first, so we can try to put it right. Contact us through the contact
              page. We will give you a first written reply within {SUBSCRIPTION_TERMS.complaintReplyWorkingDays} working days.
            </p>

            <h2>15. Your statutory rights</h2>
            <p>
              Nothing in these terms affects your legal rights as a consumer. Where the UK subscription contract rules under
              the Digital Markets, Competition and Consumers Act 2024 apply to your subscription, they give you further rights,
              including clear information before you subscribe, reminders before renewal where required, and the right to end
              the subscription easily online.
            </p>

            <h2>16. Privacy</h2>
            <p>
              We use personal data as described in our <a href="/privacy">privacy notice</a>.
            </p>

            <h2>17. Changes to these terms</h2>
            <p>
              We may update these terms. If a change affects an existing subscription, we will give you at least{" "}
              {SUBSCRIPTION_TERMS.priceChangeNoticeDays} days&apos; written notice of it, and you can end your subscription
              before it takes effect without a fee. Other changes apply to new customers only.
            </p>

            <h2>18. Governing law</h2>
            <p>
              These terms are governed by the law of England and Wales. The courts of England and Wales have jurisdiction, but
              if you are a consumer you may also bring a case in the courts of the part of the UK where you live.
            </p>

            <h2>Scoped subscriptions</h2>
            <p>
              Booking systems and custom software offered on a monthly subscription are scoped individually. The price, term
              and ownership arrangements for them are set out in their own written proposal.
            </p>

            <p className="fine">
              Questions about these terms? <a href="/contact?topic=other">Contact us</a>. Current prices are on our{" "}
              <a href="/pricing">pricing page</a>, where hosting for a website bought outright is {formatGBP(CARE_PLANS.hosting.monthly)} a month.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
