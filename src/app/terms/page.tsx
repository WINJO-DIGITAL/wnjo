import { PageHero } from "@/components/Blocks";
import { pageMetadata } from "@/lib/metadata";
import { LegalDraftNotice } from "@/components/pricing/WebsitePackages";
import { CARE_PLANS, OWNERSHIP, formatGBP } from "@/lib/pricing";
import { site } from "@/lib/site";

export const metadata = pageMetadata(
  "/terms",
  "Terms and conditions",
  "The terms that apply to quotes, deposits, balances, monthly subscriptions and work with WINJO DIGITAL.",
);

/*
 * Confirmed by the owner on 7 November 2026 (quote terms version 2026-11-07, see lib/terms). The monthly
 * subscription section was approved by the owner on 8 November 2026 (version 2026-11-08), then redrafted the same day
 * for website packages with ownership after 12 payments (version 2026-11-08.2, a DRAFT awaiting legal review: it
 * shows a notice while LEGAL_REVIEW_PENDING is true and must not go live until it is reviewed). Not reviewed by a
 * lawyer; a short legal review is recommended before taking live payments. Bump QUOTE_TERMS_VERSION whenever the
 * payment, cancellation or refund wording here changes.
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

            <h2>Monthly website packages</h2>
            <p>
              A monthly website package (Core, Plus or Pro) has a one-off setup fee, then a monthly payment that
              covers the design and build of your website, managed hosting, security updates, technical maintenance,
              support and any content updates your package includes. Your proposal sets out the package, the price and
              exactly what it covers. Payments are taken monthly in advance through Stripe.
            </p>
            <p>
              The minimum term is {OWNERSHIP.minimumTermMonths} months. After that, the subscription continues month to
              month, with hosting, maintenance, support and any agreed ongoing services as set out in your agreement.
              What happens if a subscription ends during the minimum term is set out in your written agreement.
            </p>
            <h2>Ownership after {OWNERSHIP.ownershipAfterPayments} payments</h2>
            <p>
              After {OWNERSHIP.ownershipAfterPayments} successful monthly payments, ownership of the website deliverables
              agreed in your proposal transfers to you. You can keep your hosting and support with us, or ask us to
              transfer the website to you under the transfer policy, with {OWNERSHIP.noticeDays} days&apos; notice.
            </p>
            <p>
              Your domain is registered in your name, and its registration is documented in your agreement. Third-party
              licences and subscriptions remain subject to their own terms. Our own reusable tools, components and
              frameworks are not transferred automatically.
            </p>
            <p>
              Until ownership transfers, your subscription gives you the right to use the website while it is active.
              If the subscription ends before ownership transfers, the website stays with us, and we will tell you what
              happens to your files before that date.
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
              Monthly website packages already include hosting.
              You can cancel hosting with 30 days&apos; notice. We will help move your site to another host if you ask.
            </p>

            <h2>Cancellation</h2>
            <p>
              You have 14 days from accepting a quote to cancel, as UK consumer law allows. If you ask us to start work
              straight away, and you cancel within those 14 days, you pay for the work done up to the point you cancel,
              and we refund the rest of what you have paid. Once you have asked us to start, we will ask you to confirm
              that you understand you may lose the right to cancel once work is complete.
            </p>

            <h2>Your website and files</h2>
            <p>
              <strong>One-off bespoke projects:</strong> the design and build remain ours until the final payment has
              cleared. We then release the finished site, its files and its source code to you, and copyright in the
              bespoke design passes to you on that full payment. Until then, the site is hosted and shown to you for
              review only.
            </p>
            <p>
              <strong>Monthly packages:</strong> ownership of the website deliverables passes to you after
              {" "}{OWNERSHIP.ownershipAfterPayments} successful monthly payments, as set out under
              &ldquo;Ownership after {OWNERSHIP.ownershipAfterPayments} payments&rdquo; above. Until then, your
              subscription gives you the right to use the website while it is active.
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

            <h2>Governing law</h2>
            <p>These terms are governed by the law of England and Wales.</p>

            <p className="fine">Questions about these terms? <a href="/contact?topic=other">Contact us</a>.</p>
          </div>
        </div>
      </section>
    </>
  );
}
