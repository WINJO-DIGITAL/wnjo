import { PageHero } from "@/components/Blocks";
import { pageMetadata } from "@/lib/metadata";
import { LegalDraftNotice } from "@/components/pricing/WebsitePackages";
import { CARE_PLANS, REFRESH, WEBSITE_PLANS, formatGBP } from "@/lib/pricing";
import { site } from "@/lib/site";

export const metadata = pageMetadata(
  "/terms",
  "Terms and conditions",
  "The terms that apply to managed website subscriptions, quotes, deposits, balances and work with WINJO DIGITAL.",
);

/*
 * Confirmed by the owner on 7 November 2026 (quote terms version 2026-11-07, see lib/terms). The monthly
 * subscription section was approved by the owner on 8 November 2026 (version 2026-11-08), then redrafted the same day
 * for website packages with ownership after 12 payments (version 2026-11-08.2, a DRAFT awaiting legal review: it
 * shows a notice while LEGAL_REVIEW_PENDING is true and must not go live until it is reviewed). Not reviewed by a
 * lawyer; a short legal review is recommended before taking live payments. Bump QUOTE_TERMS_VERSION whenever the
 * payment, cancellation or refund wording here changes.
 *
 * 10 November 2026 (version 2026-11-10.2, DRAFT): the monthly section is rewritten for managed website subscriptions
 * (Core, Pro and Plus): rolling monthly, no minimum term, no setup fee, Winjo Refresh, and the ownership position
 * from the owner's repositioning brief. It states principles only. Notice periods, what happens to the website when
 * a subscription ends, transfer arrangements and any fees are NOT agreed and are deliberately left to the written
 * agreement. LEGAL_REVIEW_PENDING is true, so the draft notice shows; this must be reviewed before it is relied on.
 */
export default function TermsPage() {
  return (
    <>
      <PageHero eyebrow="Legal" title="Terms and conditions." lede="The terms that apply when you work with us." />
      <section className="section--tight" style={{ paddingTop: 0 }}>
        <div className="container container--wide">
          <div className="prose">
            <LegalDraftNotice />
            <h2>Who we are</h2>
            <p>
              These terms are between you and {site.name}, a sole trader business based at 3 Knoxwood Close,
              Thornton-Cleveleys, FY5 3UP.
            </p>

            <h2>Quotes</h2>
            <p>
              A quote is based on the answers you give us. It is valid for the period shown on the quote. If the work
              changes from what you described, we will tell you before it goes ahead and quote again if needed.
            </p>

            <h2>Deposits and balances</h2>
            <p>
              For a bespoke project, when you accept a quote, a deposit of 50% of the quoted price is payable. The remaining 50% is payable
              once the site is ready for your final review, before it goes live, so you can see the finished work
              first. Payments are taken through Stripe. {site.name} is not VAT registered, so no VAT is charged.
            </p>

            <h2>Managed website subscriptions</h2>
            <p>
              A managed website subscription ({WEBSITE_PLANS.bronze.name}, {WEBSITE_PLANS.silver.name} or{" "}
              {WEBSITE_PLANS.gold.name}) is a monthly payment that covers the design and build of your website, managed
              hosting, security monitoring, backups, technical maintenance, support and the other services your plan
              includes. Your proposal sets out the plan, the price and exactly what it covers. Payments are taken
              monthly in advance through Stripe.
            </p>
            <p>
              Subscriptions are rolling monthly. There is no minimum contract term. We manage your website for as long
              as your subscription is active. How to end a subscription, and what happens to the website when it ends,
              are set out in your written agreement before you subscribe.
            </p>
            <h2>Winjo Refresh</h2>
            <p>
              {WEBSITE_PLANS.silver.name} and {WEBSITE_PLANS.gold.name} subscriptions include Winjo Refresh: a planned
              refresh of your website&apos;s design and experience every {REFRESH.everyMonths} months while your
              subscription is active. It is a defined refresh service. It does not include unlimited redevelopment or
              an unlimited number of new pages or features, which are quoted separately. What your refresh covers is
              set out in your written agreement.
            </p>
            <h2>What you own and what we own</h2>
            <p>
              Your domain name is yours, and its registration is documented in your agreement. The business content you
              supply, such as your text, images and branding, remains yours. Third-party licences and subscriptions
              remain subject to their own terms.
            </p>
            <p>
              The code and framework we use to build and run managed websites remain ours, subject to the service terms
              agreed with you. Your subscription gives you the right to use the website while it is active.
            </p>
            <p>
              Subscriptions that began under earlier terms, with a minimum term or with ownership passing after a set
              number of payments, continue under the terms agreed when they began.
            </p>
            <h2>Scoped subscriptions</h2>
            <p>
              Booking systems and custom software offered on a monthly subscription are scoped individually. The
              price, term and ownership arrangements for them are set out in their own written proposal.
            </p>

            <h2>Your content</h2>
            <p>
              You confirm that the text, images and other material you give us can be used on your website, and that you
              have the rights to it. Where we use stock imagery or third-party material, we say so.
            </p>

            <h2>Changes and revisions</h2>
            <p>
              Each website includes two rounds of changes. A round is one request for changes from you after we share a
              preview. Extra rounds are quoted before they start.
            </p>

            <h2>Hosting and care</h2>
            <p>
              For websites paid up front, managed hosting is {formatGBP(CARE_PLANS.hosting.monthly)} a month. It covers
              hosting, the SSL certificate, daily backups, uptime monitoring, security updates and technical support.
              Managed website subscriptions already include hosting.
              You can cancel hosting with 30 days&apos; notice. We will help move your site to another host if you ask.
            </p>

            <h2>Cancellation</h2>
            <p>
              You can cancel your contract with us within 14 days of the day it is made (the day you accept your quote,
              or the day you first agree to a subscription). You do not need to give a reason. To cancel, tell us in
              writing or by email, using the details on our contact page. We will refund everything you have paid within
              14 days of hearing from you.
            </p>
            <p>
              If you ask us to start work during those 14 days, you must make that request clearly, at the time you accept.
              If you then cancel, you pay only for the work we have done up to that point, in proportion to the total
              price, and we refund the rest. If you did not ask us to start, or if we did not give you this cancellation
              information before you agreed, you pay nothing for work done in the 14 days.
            </p>
            <p>
              After the 14-day period, a monthly subscription can be ended as set out in its written agreement. The UK
              subscription contract rules are expected to apply to subscriptions from 1 January 2027. Where they apply,
              they give you further rights, including clear information before you subscribe and easy cancellation.
              Nothing in these terms affects your statutory rights under the Consumer Rights Act 2015.
            </p>

            <h2>Your website and files</h2>
            <p>
              <strong>One-off bespoke projects:</strong> the design and build remain ours until the final payment has
              cleared. We then release the finished site, its files and its source code to you, and copyright in the
              bespoke design passes to you on that full payment. Until then, the site is hosted and shown to you for
              review only.
            </p>
            <p>
              <strong>Managed website subscriptions:</strong> see &ldquo;What you own and what we own&rdquo;
              above.
            </p>

            <h2>Liability</h2>
            <p>
              Nothing in these terms limits our liability for death or personal injury caused by our negligence, or for
              fraud. Otherwise, our liability for any work is limited to the price you have paid for it, except where the
              law does not allow that limit.
            </p>

            <h2>Complaints</h2>
            <p>
              If something goes wrong, please tell us first, so we can try to put it right. Contact us through the
              details on our website, and we will reply within a reasonable time. You also have rights under UK consumer
              law that are not affected by these terms.
            </p>

            <h2>Your statutory rights</h2>
            <p>
              Nothing in these terms affects your legal rights as a consumer. Services we provide will be performed with
              reasonable care and skill, as the Consumer Rights Act 2015 requires.
            </p>

            <h2>Governing law</h2>
            <p>These terms are governed by the law of England and Wales.</p>

            <p className="fine">Questions about these terms? <a href="/contact?topic=other">Contact us</a>.</p>
          </div>
        </div>
      </section>
    </>
  );
}
