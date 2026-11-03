import type { Viewport } from "next";
import Link from "next/link";
import { CtaBand } from "@/components/Blocks";
import { ArrowRight } from "@/components/Icons";
import { ServiceSwitcher } from "@/components/ServiceSwitcher";
import { BookingDemo } from "@/components/interactive/BookingDemo";
import { BookingStudio } from "@/components/interactive/BookingStudio";
import { PhoneFan } from "@/components/interactive/PhoneFan";
import { archivo, jost } from "@/lib/fonts";
import { pageMetadata } from "@/lib/metadata";
import { projectBySlug } from "@/lib/projects";

// Phones' browser bar takes the hero's pale blue-teal, to match the header.
export const viewport: Viewport = { themeColor: "#E3EAE8" };

export const metadata = pageMetadata(
  "/booking-software",
  "Booking software for your business",
  "Booking apps for any business, with payments, your branding and an operator app. Proven at EV Exec.",
);

const evexec = projectBySlug("ev-exec")!;

/*
 * Shown, not described, in the order a booking happens: the customer books (the hero
 * replay), the office and drivers take it from there (the real apps), then the visitor
 * makes it their own.
 */
export default function BookingSoftwarePage() {
  return (
    <>
      {/*
        Compact copy, so the replay is on screen as soon as the page opens: on phones the
        buttons follow the replay; on desktop the copy and buttons sit beside it.
      */}
      <section className={`tile booking-hero ${jost.variable}`} aria-labelledby="hero-title">
        <div className="container container--wide">
          <ServiceSwitcher current="booking" />
          <div className="booking-hero__layout">
            <div className="booking-hero__copy">
              <h1 id="hero-title" className="tile__title rise" style={{ "--i": 1 } as React.CSSProperties}>
                Booked in a minute. <span className="serif-em">In your app in a second.</span>
              </h1>
              <p className="tile__line rise" style={{ "--i": 2 } as React.CSSProperties}>
                Booking apps for any business.
              </p>
            </div>
            <div className="booking-hero__visual rise" style={{ "--i": 3 } as React.CSSProperties}>
              <BookingDemo />
              <p className="booking-hero__caption">
                Built for {evexec.name} · Example details · <Link href="/work#ev-exec">See the project</Link>
              </p>
            </div>
            <div className="tile__ctas booking-hero__ctas rise" style={{ "--i": 4 } as React.CSSProperties}>
              <Link href="/contact?topic=booking-software" className="btn btn--primary">
                Request a demo
                <ArrowRight />
              </Link>
              <Link href="#make-it-yours" className="btn btn--secondary">
                Make it yours
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Where the booking lands: the office's app and the drivers', swipeable. */}
      <section id="apps" className="tile inverse" aria-labelledby="apps-title">
        <div className="container container--wide" data-reveal>
          <h2 id="apps-title" className="tile__title">
            Run the office. <span className="serif-em">Run the road.</span>
          </h2>
          <p className="tile__line">Operator and driver apps. Real screens, example details.</p>
        </div>
        <div className="container container--wide tile__visual" data-reveal style={{ "--d": 1 } as React.CSSProperties}>
          <PhoneFan />
        </div>
      </section>

      {/* Not just airports: the visitor restyles the app for their own business. */}
      <section
        id="make-it-yours"
        className={`tile ${jost.variable} ${archivo.variable}`}
        aria-labelledby="studio-title"
      >
        <div className="container container--wide" data-reveal>
          <p className="tile__name">Make it yours</p>
          <h2 id="studio-title" className="tile__title">
            Your business. <span className="serif-em">Your booking app.</span>
          </h2>
        </div>
        <div className="container container--wide booking-studio">
          <BookingStudio />
          <p className="studio__more">
            <Link href="/app-development" className="arrow-link">
              Something different in mind? App development <ArrowRight />
            </Link>
          </p>
        </div>
      </section>

      <CtaBand
        title={
          <>
            See it <span className="serif-em">working.</span>
          </>
        }
        body="Live demo. No obligation."
      >
        <Link href="/contact?topic=booking-software" className="btn btn--primary">
          Request a demo
        </Link>
      </CtaBand>
    </>
  );
}
