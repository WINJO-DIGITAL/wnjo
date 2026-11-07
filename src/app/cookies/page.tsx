import Link from "next/link";
import { PageHero } from "@/components/Blocks";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata(
  "/cookies",
  "Cookies",
  "What this website stores in your browser, and why.",
);

/*
 * Describes what the code in this repository stores. Re-check this page whenever analytics, advertising or any
 * new third-party script is added. DRAFT for owner and legal review.
 */
export default function CookiesPage() {
  return (
    <>
      <PageHero eyebrow="Legal" title="Cookies." lede="What this website stores in your browser, and why." />
      <section className="section--tight" style={{ paddingTop: 0 }}>
        <div className="container container--wide">
          <div className="prose">
            <h2>What we don&apos;t use</h2>
            <p>
              This website doesn&apos;t use analytics, advertising or social-media tracking. There is no cookie banner
              because there is nothing optional to switch on or off.
            </p>

            <h2>What the site stores</h2>
            <p>
              <strong>Your sign-in session.</strong> If you sign in to follow your order, your session is kept in your
              browser&apos;s local storage so you stay signed in. It is removed when you sign out or clear your browser
              data. It is needed for the service you asked for.
            </p>
            <p>
              <strong>Your configurator answers.</strong> The price configurator saves your answers in local storage so
              you don&apos;t lose your place. They stay on your device until you send your brief or clear your browser
              data.
            </p>

            <h2>Payments</h2>
            <p>
              Deposits and balances are paid on Stripe&apos;s checkout pages. Stripe sets its own cookies on those pages,
              under Stripe&apos;s own cookie policy.
            </p>

            <h2>Changing your mind</h2>
            <p>
              You can clear this site&apos;s data in your browser settings at any time. That signs you out and clears
              anything saved on this site. For questions, <Link href="/privacy">read our privacy notice</Link> or{" "}
              <Link href="/contact?topic=other">contact us</Link>.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
