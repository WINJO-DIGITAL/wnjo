import Link from "next/link";
import { NoScriptContact } from "@/components/NoScriptContact";
import { PageHero } from "@/components/Blocks";
import { ContactForm } from "@/components/ContactForm";
import { ArrowRight } from "@/components/Icons";
import { NEXT_STEPS } from "@/lib/enquiry";
import { pageMetadata } from "@/lib/metadata";
import { contactPhoneHref } from "@/lib/site";

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
            {/* Beside the form on desktop, above it on phones: when we reply and the other ways to reach us. */}
            <aside className="contact-reach" aria-labelledby="reach-title">
              <h2 id="reach-title" className="contact-reach__title">We reply within one working day.</h2>
              <p className="contact-reach__line">
                Prefer email? <a href="mailto:hello@winjodigital.co.uk">hello@winjodigital.co.uk</a>
              </p>
              {contactPhoneHref && (
                <a href={contactPhoneHref} className="btn btn--secondary btn--sm contact-reach__call">
                  Call us
                </a>
              )}
            </aside>
            <div className="card card--raised contact-grid__form">
              <ContactForm
                topic={Array.isArray(topic) ? topic[0] : topic}
                brief={Array.isArray(brief) ? brief[0] : brief}
              />
              <NoScriptContact />
            </div>
            <div className="contact-next">
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
              <p className="contact-next__plan">
                Know which plan you want?{" "}
                <Link href="/pricing" className="arrow-link">
                  Choose a plan <ArrowRight />
                </Link>
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
