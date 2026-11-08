import Link from "next/link";
import { NoScriptContact } from "@/components/NoScriptContact";
import { PageHero } from "@/components/Blocks";
import { ContactForm } from "@/components/ContactForm";
import { ArrowRight } from "@/components/Icons";
import { NEXT_STEPS } from "@/lib/enquiry";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata(
  "/contact",
  "Start a project",
  "Tell WINJO DIGITAL about your website or app project: what you need, your budget, your goals and your timeline.",
);

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { topic, brief } = await searchParams;
  return (
    <>
      <PageHero
        eyebrow="Start a project"
        title={
          <>
            Tell us what you <span className="serif-em">want to achieve.</span>
          </>
        }
        lede="Your goal, the challenge, and a budget if you have one. It takes about a minute."
      />
      <section className="section--tight" style={{ paddingTop: 0 }}>
        <div className="container container--wide">
          <div className="contact-grid">
            <div className="card card--raised">
              <ContactForm
                topic={Array.isArray(topic) ? topic[0] : topic}
                brief={Array.isArray(brief) ? brief[0] : brief}
              />
              <NoScriptContact />
            </div>
            <div className="stack" style={{ "--stack": "var(--space-7)" } as React.CSSProperties}>
              <div>
                <h2 className="h3">What happens next</h2>
                <ol role="list" className="next-steps mt-5">
                  {NEXT_STEPS.map(([title, body], i) => (
                    <li key={title}>
                      <span className="next-steps__num">{String(i + 1).padStart(2, "0")}</span>
                      <div>
                        <strong>{title}</strong>
                        <p>{body}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
              <div className="feature">
                <h2 className="h3">Want a price first?</h2>
                <p className="muted">
                  The website configurator gives you an indicative price in about two minutes and sends us a complete
                  brief.
                </p>
                <p className="mt-4">
                  <Link href="/build" className="arrow-link">
                    Get my price <ArrowRight />
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
