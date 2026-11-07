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
              These terms are between you and [legal business name], trading as {site.name}, of [registered address].
              [Company or sole trader status and registration number to be confirmed.]
            </p>

            <h2>Quotes</h2>
            <p>
              A quote is based on the answers you give us. It is valid for the period shown on the quote. If the work
              changes from what you described, we will tell you before it goes ahead and quote again if needed.
            </p>

            <h2>Deposits and balances</h2>
            <p>
              When you accept a quote, a deposit of 50% of the quoted price is payable. The balance is requested once
              the site is ready for final review, before launch, and is payable from your account. Payments are taken
              through Stripe. [VAT treatment to be confirmed.]
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
              [Hosting and care terms, including the monthly charge, what it covers and how it can be cancelled, to be
              confirmed.]
            </p>

            <h2>Cancellation</h2>
            <p>[Cancellation and refund terms to be confirmed, including how they apply to the deposit once work has started.]</p>

            <h2>Liability</h2>
            <p>[Limits of liability to be confirmed.]</p>

            <h2>Governing law</h2>
            <p>[Governing law and jurisdiction to be confirmed.]</p>

            <p className="fine">Questions about these terms? <a href="/contact?topic=other">Contact us</a>.</p>
          </div>
        </div>
      </section>
    </>
  );
}
