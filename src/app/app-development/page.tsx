import type { Viewport } from "next";
import Image from "next/image";
import Link from "next/link";
import { CtaBand, PageHero } from "@/components/Blocks";
import { BuildStages } from "@/components/BuildStages";
import { ArrowRight } from "@/components/Icons";
import { AppBuilder } from "@/components/interactive/AppBuilder";
import { ClipShowcase, type ClipItem } from "@/components/interactive/ClipShowcase";
import { SheetToApp } from "@/components/interactive/SheetToApp";
import { pageMetadata } from "@/lib/metadata";
import { projectBySlug } from "@/lib/projects";
import opBookings from "../../../public/work/app/op-bookings.webp";

const evexec = projectBySlug("ev-exec")!;
const fystay = projectBySlug("fystay")!;

// Phones' browser bar takes the hero's sage, to match the header.
export const viewport: Viewport = { themeColor: "#E8EADE" };

export const metadata = pageMetadata(
  "/app-development",
  "App development",
  "Bespoke web and mobile apps, customer portals, internal tools and integrations, scoped carefully and built around the way your business operates.",
);

const clips: ClipItem[] = [
  { ...evexec, what: "Airport transfer booking, with driver and operator apps", href: "/booking-software" },
  { ...fystay, what: "A holiday stays platform with a host dashboard", href: "/work#fystay" },
];

// What the visitor wants to replace, handed to the enquiry form as the start of a brief.
const replace = [
  ["Spreadsheets", "I'd like to replace our spreadsheets with an app."],
  ["Paper forms", "I'd like to replace our paper forms with an app."],
  ["Another tool", "I'd like to replace a tool that doesn't fit how we work."],
];

/*
 * Shown, not described: the hero turns a spreadsheet into an app, the visitor builds one
 * from features, real apps play in a browser, and the process is one screen evolving.
 */
export default function AppDevelopmentPage() {
  return (
    <>
      <PageHero
        service="apps"
        eyebrow="App development"
        title={
          <>
            Apps, <span className="serif-em">built around how you work.</span>
          </>
        }
        lede="Your spreadsheets and workarounds, turned into an app."
      >
        <div className="apps-hero__body">
          <div className="btn-row">
            <Link href="/contact?topic=bespoke" className="btn btn--primary">
              Plan my app
            </Link>
            <Link href="#build" className="btn btn--secondary">
              Build yours here
            </Link>
          </div>
          <div className="apps-hero__visual">
            <SheetToApp />
          </div>
        </div>
      </PageHero>

      <section id="build" className="tile" aria-labelledby="build-title">
        <div className="container container--wide" data-reveal>
          <p className="tile__name">Build your app</p>
          <h2 id="build-title" className="tile__title">
            Pick the parts. <span className="serif-em">Watch it come together.</span>
          </h2>
        </div>
        <div className="container container--wide apps-tile__body">
          <AppBuilder />
        </div>
      </section>

      <section id="examples" className="tile inverse" aria-labelledby="examples-title">
        <div className="container container--wide" data-reveal>
          <p className="tile__name">From our work</p>
          <h2 id="examples-title" className="tile__title">
            Apps we&apos;ve <span className="serif-em">already built.</span>
          </h2>
        </div>
        <div className="container container--wide apps-tile__body">
          <ClipShowcase items={clips} />
        </div>
      </section>

      <section id="process" className="tile" aria-labelledby="process-title">
        <div className="container container--wide" data-reveal>
          <p className="tile__name">How it works</p>
          <h2 id="process-title" className="tile__title">
            Scope first, <span className="serif-em">then build.</span>
          </h2>
          <p className="tile__line">Nothing to pay until you approve the scope.</p>
        </div>
        <div className="container container--wide apps-tile__body">
          <BuildStages />
        </div>
      </section>

      {/* For bookings, there's a ready-made option. */}
      <section className="section--tight">
        <div className="container container--wide">
          <Link href="/booking-software" className="apps-booking">
            <span className="app-phone apps-booking__phone">
              <Image src={opBookings} alt="" sizes="96px" placeholder="blur" />
            </span>
            <span>
              <b>Taking bookings?</b>
              Our booking software is ready-made.
            </span>
            <ArrowRight />
          </Link>
        </div>
      </section>

      <CtaBand
        title={
          <>
            What would you <span className="serif-em">replace first?</span>
          </>
        }
        body="Tap one to start. We'll take it from there."
      >
        {replace.map(([label, brief]) => (
          <Link
            key={label}
            href={`/contact?topic=bespoke&brief=${encodeURIComponent(brief)}`}
            className="btn btn--secondary"
          >
            {label}
          </Link>
        ))}
        <Link href="/contact?topic=bespoke" className="btn btn--primary">
          Something else
        </Link>
      </CtaBand>
    </>
  );
}
