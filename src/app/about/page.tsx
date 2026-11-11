import Link from "next/link";
import { CtaBand, PageHero, SectionHead } from "@/components/Blocks";
import { PhoneFrame } from "@/components/Devices";
import { pageMetadata } from "@/lib/metadata";
import { projects } from "@/lib/projects";
import { site } from "@/lib/site";

export const metadata = pageMetadata(
  "/about",
  "About",
  "Why WINJO DIGITAL exists: bespoke websites we take long-term responsibility for, so business owners have one less thing to worry about.",
);

// Each principle as a plain statement: what we do, in one sentence.
const beliefs = [
  ["Your website, our responsibility", "If something breaks, dates or needs changing, it is ours to sort out."],
  ["Designed around your business", "Every website is bespoke. We don't sell templates."],
  ["Prices on the page", "One monthly price you can see before you speak to us, confirmed in writing."],
  ["No lock-in", "Rolling monthly, with no minimum term. We'd rather earn your next month."],
  ["Plain English", "Quick answers and no jargon, from the first message onwards."],
  ["Honest about search", "Strong foundations, and no promises nobody can keep."],
];

const standards = [
  ["Accessible", ["Semantic markup and keyboard support", "Visible focus and sufficient contrast", "Aiming for WCAG 2.2 AA"], "a11y"],
  ["Fast", ["Lean pages", "Optimised images", "As little JavaScript as the job needs"], "fast"],
  ["Secure", ["Input validated on the server", "Secrets kept out of the browser", "Prices recalculated server-side"], "secure"],
  ["Maintainable", ["Clear structure", "Shared design tokens", "So the next change is as careful as the first"], "tokens"],
] as const;

// Why we exist, as two short labelled lists rather than paragraphs. What a website needs, and how we are different.
const needs = ["Hosting and security", "Updates and changes", "A new design every couple of years"];
const different = [
  "Every website looks and works differently, never a template",
  "Booking systems and software, like the driver and operator apps we developed for EV Exec",
  "FYStay, the holiday stays platform we run ourselves",
];

/** A small picture of each standard, drawn in code (decorative: the text says it all). */
function StandardDemo({ kind }: { kind: (typeof standards)[number][2] }) {
  if (kind === "a11y")
    return (
      <span className="std std--a11y">
        <kbd>Tab</kbd>
        <span className="std__arrow" />
        <span className="std__btn">Get started</span>
      </span>
    );
  if (kind === "fast")
    return (
      <span className="std std--fast">
        <span className="std__page">
          <i style={{ width: "60%" }} />
          <i style={{ width: "90%", height: "2.2em" }} />
          <i style={{ width: "75%" }} />
        </span>
        <span className="std__tick">✓</span>
      </span>
    );
  if (kind === "secure")
    return (
      <span className="std std--secure">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <rect x="5" y="10.5" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.6" />
          <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" stroke="currentColor" strokeWidth="1.6" />
        </svg>
        <span className="std__pill">Your quote can’t be changed in the browser</span>
      </span>
    );
  return (
    <span className="std std--tokens">
      {["#d45b32", "#56624a", "#2f5d62", "#f2ece2", "#3a2d22"].map((c) => (
        <i key={c} style={{ background: c }} />
      ))}
    </span>
  );
}

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow={`About ${site.name}`}
        title={<>We don&apos;t hand over and disappear.</>}
        lede={`${site.name} designs bespoke websites, then stays responsible for them: hosting, maintenance, updates and regular redesigns.`}
      />

      <section className="section section--ruled">
        <div className="container container--wide">
          <div className="split">
            <div className="about-lead">
              <p className="statement">
                Most websites are built, handed over and left to age. <em>We think the job starts at launch.</em>
              </p>
              <div className="about-points">
                <div className="about-points__group">
                  <p className="about-points__label">A website is never finished. It needs</p>
                  <ul role="list" className="checks">
                    {needs.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  <p className="about-points__note">
                    Most business owners end up organising all of that themselves. We take it on instead, for one
                    predictable monthly payment.
                  </p>
                </div>
                <div className="about-points__group">
                  <p className="about-points__label">What we do differently</p>
                  <ul role="list" className="checks">
                    {different.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
            <div className="about-phones" aria-label="A selection of our work">
              {projects.map((p) => (
                <PhoneFrame key={p.slug} src={p.mobile} alt={`The ${p.name} website on a phone`} sizes="160px" />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section section--ruled">
        <div className="container container--wide">
          <SectionHead eyebrow="Principles" title={<>What guides the work.</>} />
          <ul role="list" className="beliefs">
            {beliefs.map(([title, statement]) => (
              <li key={title} className="belief" data-reveal>
                <h3 className="belief__title">{title}</h3>
                <p className="belief__yes">{statement}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section inverse">
        <div className="container container--wide">
          <SectionHead eyebrow="Engineering standards" title={<>The parts you don&apos;t see.</>} split>
            <p>Every project, large or small, is built to the same baseline.</p>
          </SectionHead>
          <div className="grid-2" style={{ rowGap: "var(--space-7)" }}>
            {standards.map(([title, body, kind]) => (
              <div key={title} className="feature">
                <div className="feature__demo" aria-hidden="true">
                  <StandardDemo kind={kind} />
                </div>
                <h3 className="h3">{title}</h3>
                <ul role="list" className="checks">
                  {body.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CtaBand tone="light" title={<>Your website. Our responsibility.</>}>
        <Link href="/pricing" className="btn btn--primary">
          Choose a plan
        </Link>
        <Link href="/contact" className="btn btn--secondary">
          Talk to us
        </Link>
      </CtaBand>
    </>
  );
}
