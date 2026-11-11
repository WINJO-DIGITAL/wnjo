import Link from "next/link";
import { NoScriptContact } from "@/components/NoScriptContact";
import { PageHero } from "@/components/Blocks";
import { ContactForm } from "@/components/ContactForm";
import { ArrowRight } from "@/components/Icons";
import { NEXT_STEPS } from "@/lib/enquiry";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata(
  "/contact",
  "Contact",
  "Tell WINJO DIGITAL about your business and the website you need. We reply with honest advice, a recommended plan and a clear monthly price.",
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
        eyebrow="Get started"
        title={
          <>
            Tell us about your business.
          </>
        }
        lede="What you do, and what you need your website to do. It takes about a minute."
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
                  {NEXT_STEPS.map(([title, body]) => (
                    <li key={title}>
                      <div>
                        <strong>{title}</strong>
                        <p>{body}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
              <div className="feature">
                <h2 className="h3">Know which plan you want?</h2>
                <p className="muted">
                  Choose Core, Plus or Pro and see your monthly price.
                </p>
                <p className="mt-4">
                  <Link href="/pricing" className="arrow-link">
                    Choose a plan <ArrowRight />
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
