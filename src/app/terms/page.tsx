import { PageHero } from "@/components/Blocks";
import { pageMetadata } from "@/lib/metadata";
import { site } from "@/lib/site";

export const metadata = pageMetadata(
  "/terms",
  "Terms and conditions",
  "The terms that apply to quotes, deposits, balances and work with WNJO.",
);

/*
 * DRAFT for owner and legal review. Items in square brackets are not yet confirmed by the business and must be
 * completed before this page is relied on. Nothing here has been checked by a lawyer.
 */
export default function TermsPage() {
  return (
    <>
      <PageHero eyebrow="Legal" title="Terms and conditions." lede="The terms that apply when you work with us." />
      <section className="section--tight" style={{ paddingTop: 0 }}>
        <div className="container container--wide">
          <div className="prose">
            <p className="fine">
              <strong>Draft pending review.</strong> Items in square brackets are still to be confirmed by {site.name}.
            </p>

            <h2>Who we are</h2>
            <p>
              These terms are between you and {site.name}, a sole trader business based at 3 Knoxwood Close,
              Cleveleys, FY5 3UP. [Town to confirm: Cleveleys or Taunton.]
            </p>

            <h2>Quotes</h2>
            <p>
              A quote is based on the answers you give us. It is valid for the period shown on the quote. If the work
              changes from what you described, we will tell you before it goes ahead and quote again if needed.
            </p>

            <h2>Deposits and balances</h2>
            <p>
              When you accept a quote, a deposit of 50% of the quoted price is payable. The remaining 50% is payable
              once the site is ready for your final review, before it goes live, so you can see the finished work
              first. Payments are taken through Stripe. {site.name} is not VAT registered, so no VAT is charged.
            </p>

            <h2>Your content</h2>
            <p>
              You confirm that the text, images and other material you give us can be used on your website, and that you
              have the rights to it. [Confirm any limits on the use of stock imagery or third-party material.]
            </p>

            <h2>Changes and revisions</h2>
            <p>
              The number of design revisions included is set out in your quote. [Confirm the revision rounds and how
              extra rounds are charged.]
            </p>

            <h2>Hosting and care</h2>
            <p>
              Managed hosting is £25 a month. It covers hosting, the SSL certificate, daily backups and uptime monitoring.
              [Notice period for cancelling hosting to be confirmed.]
            </p>

            <h2>Cancellation</h2>
            <p>
              You can cancel before work starts. Once work has started, the deposit covers the work already done and is
              not refundable. [Confirm how UK consumer cancellation rights apply to online orders.]
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
