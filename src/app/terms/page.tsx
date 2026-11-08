import { PageHero } from "@/components/Blocks";
import { pageMetadata } from "@/lib/metadata";
import { site } from "@/lib/site";

export const metadata = pageMetadata(
  "/terms",
  "Terms and conditions",
  "The terms that apply to quotes, deposits, balances, monthly subscriptions and work with WINJO DIGITAL.",
);

/*
 * Confirmed by the owner on 7 November 2026 (quote terms version 2026-11-07, see lib/terms). The monthly
 * subscription section was approved by the owner on 8 November 2026 (version 2026-11-08). Not reviewed by a
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

            <h2>Monthly subscriptions</h2>
            <p>
              If you choose a monthly subscription, the cost of building your website or system is spread across your
              monthly payments, together with hosting, maintenance, security updates, support and any improvements your
              plan includes. Your quote sets out the monthly price and exactly what it covers. Payments are taken monthly
              in advance through Stripe.
            </p>
            <p>
              The minimum term is 12 months from the date your website or system goes live. After that, the subscription
              continues month to month, and either of us can end it with 30 days&apos; notice. If you end it during the
              minimum term, the payments for the rest of the minimum term become due.
            </p>
            <p>
              You can buy the build outright at any time. Your quote sets out the buy-out price, which reduces as you
              make your monthly payments. Once it is paid, ownership passes to you as described under &ldquo;Your
              website and files&rdquo;, and you can keep or cancel hosting and care.
            </p>
            <p>
              Your domain and the content you supply are always yours. If a subscription ends without a buy-out, we hand
              over your content and help you move your domain. The bespoke design and code remain ours.
            </p>

            <h2>Your content</h2>
            <p>
              You confirm that the text, images and other material you give us can be used on your website, and that you
              have the rights to it. Where we use stock imagery or third-party material, we say so.
            </p>

            <h2>Changes and revisions</h2>
            <p>
              The number of design revisions included is set out in your quote. Extra rounds are quoted before they start.
            </p>

            <h2>Hosting and care</h2>
            <p>
              Managed hosting is £25 a month. It covers hosting, the SSL certificate, daily backups and uptime monitoring.
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
              On a bespoke project, the design and build are ours until the final payment is made. We release the finished site, its files
              and its source code once that payment has cleared. Copyright in the bespoke design passes to you on
              full payment. Until then, the site is hosted and shown to you for review only.
            </p>

            <h2>Liability</h2>
            <p>
              Our liability for any work is limited to the price you have paid for it, except where the law does not
              allow that limit.
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
