import { PageHero } from "@/components/Blocks";
import { pageMetadata } from "@/lib/metadata";
import { QUOTE_TERMS_VERSION } from "@/lib/terms";
import { readLegal, renderLegal } from "@/lib/legal-markdown";

export const metadata = pageMetadata(
  "/terms",
  "Terms and conditions",
  "The terms that apply to managed website subscriptions, quotes, deposits, balances and work with WINJO DIGITAL.",
);

/* The full text lives in content/legal/terms.md. Change the wording there, and bump QUOTE_TERMS_VERSION in lib/terms. */
export default function TermsPage() {
  return (
    <>
      <PageHero eyebrow="Legal" title="Terms and conditions." lede="The terms that apply when you work with us." />
      <section className="section--tight" style={{ paddingTop: 0 }}>
        <div className="container container--wide">
          <div className="prose">
            <p className="fine">Version {QUOTE_TERMS_VERSION}. Last updated 10 November 2026.</p>
            {renderLegal(readLegal("terms"))}
          </div>
        </div>
      </section>
    </>
  );
}
