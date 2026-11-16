import Link from "next/link";
import { PageHero } from "@/components/Blocks";
import { pageMetadata } from "@/lib/metadata";
import { site } from "@/lib/site";

export const metadata = pageMetadata(
  "/privacy",
  "Privacy notice",
  "How WINJO DIGITAL handles the personal information you share through this website.",
);

/*
 * Facts in this notice come from the terms, the data processing agreement and the code
 * (Supabase, Resend, Vercel, Stripe, and Anthropic's Claude for website drafts).
 * Anthropic's processing country is not recorded in this repository.
 */
export default function PrivacyPage() {
  return (
    <>
      <PageHero eyebrow="Legal" title="Privacy notice." lede="How we handle the information you share through this website." />
      <section className="section--tight" style={{ paddingTop: 0 }}>
        <div className="container container--wide">
          <div className="prose">
            <h2>Who we are</h2>
            <p>
              The data controller is <strong>Nitisat Sirisom</strong>, a sole trader trading as {site.name}.
            </p>
            <p>
              3 Knoxwood Close, Thornton-Cleveleys, FY5 3UP, United Kingdom.
              <br />
              Email: <a href="mailto:hello@winjodigital.co.uk">hello@winjodigital.co.uk</a>
            </p>

            <h2>What we collect</h2>
            <p>
              When you send a message or a project brief, we collect the details you enter: your name, email address,
              optional business name, and the content of your message or brief. We don&apos;t ask for more than we need
              to reply.
            </p>
            <p>
              If you have ordered a website from us, you can sign in with your email address to follow its progress. We
              email you a one-time sign-in link; we don&apos;t store a password. Your order details (business name,
              project type, progress stage and the updates we post) are stored so you can see your own orders.
            </p>
            <p>
              Card payments are taken by Stripe on their pages. We keep a record of the amount, the plan and whether
              it was paid. We don&apos;t store your full card number.
            </p>

            <h2>Why we use it</h2>
            <div className="table-wrap" role="region" aria-label="Why we use personal information" tabIndex={0}>
              <table className="table table--stack">
                <thead>
                  <tr>
                    <th scope="col">Purpose</th>
                    <th scope="col">Lawful basis</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th scope="row">Replying to an enquiry before any work is agreed</th>
                    <td>Legitimate interests. You can object, and we will stop unless we have a compelling reason to continue.</td>
                  </tr>
                  <tr>
                    <th scope="row">Building, hosting and looking after a website you have asked for</th>
                    <td>Contract.</td>
                  </tr>
                  <tr>
                    <th scope="row">Taking payment and keeping tax and accounting records</th>
                    <td>Contract, and a legal obligation for the records UK law requires us to keep.</td>
                  </tr>
                  <tr>
                    <th scope="row">Drafting website wording from a brief you have given us</th>
                    <td>Contract. A contact-form message is not sent to the model unless it becomes a brief we build from.</td>
                  </tr>
                  <tr>
                    <th scope="row">Optional cookies, if we ever set any</th>
                    <td>Consent. We don&apos;t set optional cookies today.</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p>We don&apos;t sell your information or use it for unrelated marketing.</p>

            <h2>Drafting a website</h2>
            <p>
              When you ask us to build a website, the brief (your business, services, contact details and the choices
              you make) is sent to Anthropic&apos;s Claude model to draft the wording. A person checks that draft
              before you see it and before anything is published. The model does not publish the website itself.
            </p>

            <h2>Who processes it for us</h2>
            <div className="table-wrap" role="region" aria-label="Organisations that process information for us" tabIndex={0}>
              <table className="table table--stack">
                <thead>
                  <tr>
                    <th scope="col">Organisation</th>
                    <th scope="col">What they do</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th scope="row">Supabase</th>
                    <td>Database and sign-in, in Frankfurt, Germany.</td>
                  </tr>
                  <tr>
                    <th scope="row">Resend</th>
                    <td>Email delivery, in the EU (Ireland).</td>
                  </tr>
                  <tr>
                    <th scope="row">Vercel</th>
                    <td>Website hosting, in London. Their own support logs may be processed outside the UK.</td>
                  </tr>
                  <tr>
                    <th scope="row">Stripe</th>
                    <td>Card payments. Stripe handles the card details as its own controller. We keep the payment record.</td>
                  </tr>
                  <tr>
                    <th scope="row">Anthropic</th>
                    <td>The Claude model drafts website wording from a brief. A person checks the draft before it is published.</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h2>Cookies and storage</h2>
            <p>
              This website doesn&apos;t use analytics or advertising trackers, and it doesn&apos;t set optional cookies.
              If the contact form&apos;s bot check is switched on, Cloudflare may store a cookie that is strictly
              necessary to send the form. The website configurator saves your answers in your own browser&apos;s local
              storage so you don&apos;t lose progress; this stays on your device and is removed when you send your brief
              or clear your browser data. If you sign in to follow your order, your sign-in session is also kept in
              your browser&apos;s local storage until you sign out or clear your browser data.
            </p>

            <h2>How long we keep it</h2>
            <p>
              An enquiry that does not become a subscription or a project is deleted 12 months after our last contact
              with you. A website brief you start but don&apos;t send is saved for up to 30 days, and is deleted when
              you send it or when the 30 days end.
            </p>
            <p>
              When a subscription or project ends, we keep the website data for the 7-day export period in our terms,
              then delete it within a further 30 days, unless you ask sooner or the law requires us to keep it.
              Customer and billing records we must keep for tax and accounting are kept for 6 years after the service
              ends.
            </p>

            <h2>Your rights</h2>
            <p>
              Under UK GDPR you can ask for a copy of the information we hold about you, ask us to correct it, delete
              it, restrict it, or (where it applies) send it to another service. You can object to processing based on
              legitimate interests. To ask, email{" "}
              <a href="mailto:hello@winjodigital.co.uk">hello@winjodigital.co.uk</a> or use the{" "}
              <Link href="/contact?topic=other">contact form</Link>.
            </p>
            <p>
              If you&apos;re unhappy with how we&apos;ve handled your information, you can complain to the Information
              Commissioner&apos;s Office at{" "}
              <a href="https://ico.org.uk/make-a-complaint/">ico.org.uk/make-a-complaint</a>.
            </p>

            <p className="fine">
              {site.name} will update this notice if the way the website handles information changes.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
