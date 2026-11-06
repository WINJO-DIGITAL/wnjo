import Link from "next/link";
import { PageHero } from "@/components/Blocks";
import { pageMetadata } from "@/lib/metadata";
import { site } from "@/lib/site";

export const metadata = pageMetadata(
  "/privacy",
  "Privacy notice",
  "How WNJO handles the personal information you share through this website.",
);

/*
 * This notice describes what the website itself actually does. It must be reviewed
 * (and the controller's legal identity and contact details added) before launch,
 * and updated whenever analytics, payments or new integrations are introduced.
 */
export default function PrivacyPage() {
  return (
    <>
      <PageHero eyebrow="Legal" title="Privacy notice." lede="How we handle the information you share through this website." />
      <section className="section--tight" style={{ paddingTop: 0 }}>
        <div className="container container--wide">
          <div className="prose">
            <h2>What we collect</h2>
            <p>
              When you send a message or a project brief, we collect the details you enter: your name, email address,
              optional business name, and the content of your message or brief. We don&apos;t ask for more than we need
              to reply.
            </p>

            <h2>How we use it</h2>
            <p>
              We use these details only to respond to your enquiry, prepare an estimate or proposal you&apos;ve asked
              for, and keep a record of our correspondence. We don&apos;t sell your information or use it for unrelated
              marketing.
            </p>

            <h2>Customer accounts</h2>
            <p>
              If you have ordered a website from us, you can sign in with your email address to follow its progress. We
              email you a one-time sign-in link; we don&apos;t store a password. Your order details (business name,
              project type, progress stage and the updates we post) are stored with Supabase, our database provider, in
              its Frankfurt (EU) region. You can only see your own orders.
            </p>

            <h2>How it&apos;s delivered</h2>
            <p>
              Each submission is saved to a database held by Supabase, our database provider, in its Frankfurt (EU)
              region, so that it isn&apos;t lost. We also send it to our business inbox using a transactional email
              provider, which processes the message on our behalf in order to deliver it.
            </p>

            <h2>Cookies and storage</h2>
            <p>
              This website doesn&apos;t set cookies and doesn&apos;t use analytics or advertising trackers. The website
              configurator saves your answers in your own browser&apos;s local storage so you don&apos;t lose progress;
              this stays on your device and is removed when you send your brief or clear your browser data. If you sign
              in to follow your order, your sign-in session is also kept in your browser&apos;s local storage until you
              sign out or clear your browser data.
            </p>

            <h2>How long we keep it</h2>
            <p>
              We keep enquiry correspondence for as long as needed to deal with your enquiry and any work that follows,
              and then delete it unless we have a legal reason to retain it.
            </p>

            <h2>Your rights</h2>
            <p>
              You can ask us for a copy of the information we hold about you, ask us to correct or delete it, or object
              to how we use it. To do so, <Link href="/contact?topic=other">contact us</Link>. If you&apos;re unhappy
              with how we&apos;ve handled your information, you can complain to the Information Commissioner&apos;s
              Office (ICO).
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
