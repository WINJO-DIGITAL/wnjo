import type { Viewport } from "next";
import Link from "next/link";
import { CtaBand } from "@/components/Blocks";
import { ArrowRight } from "@/components/Icons";
import { BookingDemo } from "@/components/interactive/BookingDemo";
import { PhoneFan } from "@/components/interactive/PhoneFan";
import { jost } from "@/lib/fonts";
import { pageMetadata } from "@/lib/metadata";

export const viewport: Viewport = { themeColor: "#241a10" };

export const metadata = pageMetadata(
  "/booking-software/dispatch",
  "Winjo Dispatch: booking software for transfer and private hire firms",
  "Your own website, a booking system and an operator app for transfer and private hire firms. £999 upfront for the first five operators, with a free first month of hosting and free Stripe set-up.",
);

/**
 * Winjo Dispatch: the booking product for transfer and private hire firms. It sits under booking systems, with its
 * own offer. Only what the product does today is shown.
 */
export default function WinjoDispatchPage() {
  return (
    <>
      <section className={`tile inverse dispatch-hero ${jost.variable}`} aria-labelledby="dispatch-title">
        <div className="container container--wide">
          <div className="dispatch-hero__layout">
            <div className="dispatch-hero__copy">
              <p className="tile__name">Winjo Dispatch · by WINJO DIGITAL</p>
              <h1 id="dispatch-title" className="tile__title">
                Customers book on your website. You assign the job in the app.
              </h1>
              <p className="tile__line">Website, booking system and operator app for transfer and private hire firms.</p>
              <div className="tile__ctas">
                <Link href="/contact?topic=booking-software" className="btn btn--primary">
                  Request a demo
                  <ArrowRight />
                </Link>
                <Link href="#apps" className="btn btn--secondary">
                  See the apps
                </Link>
              </div>
            </div>
            <div className="dispatch-hero__visual">
              <BookingDemo />
              <p className="dispatch-hero__caption">EV Exec&apos;s booking flow · Example details</p>
            </div>
          </div>
          <dl className="dispatch-rule" aria-label="Launch offer">
            <div>
              <dt>Upfront</dt>
              <dd>£999</dd>
            </div>
            <div>
              <dt>First month of hosting</dt>
              <dd>Free</dd>
            </div>
            <div>
              <dt>Stripe set-up</dt>
              <dd>Free</dd>
            </div>
            <div>
              <dt>Launch offer</dt>
              <dd>First five operators</dd>
            </div>
          </dl>
        </div>
      </section>

      <section id="apps" className="tile" aria-labelledby="apps-title">
        <div className="container container--wide" data-reveal>
          <p className="tile__name">The apps</p>
          <h2 id="apps-title" className="tile__title">
            What the office sees.
          </h2>
          <p className="tile__line">Screens from EV Exec&apos;s system, with example details.</p>
        </div>
        <div className="container container--wide tile__visual" data-reveal style={{ "--d": 1 } as React.CSSProperties}>
          <PhoneFan />
        </div>
      </section>

      <CtaBand title={<>See it working.</>} body="Live demo. No obligation.">
        <Link href="/contact?topic=booking-software" className="btn btn--primary">
          Request a demo
        </Link>
      </CtaBand>
    </>
  );
}
