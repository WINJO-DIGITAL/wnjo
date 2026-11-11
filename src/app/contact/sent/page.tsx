import Link from "next/link";
import { PageHero } from "@/components/Blocks";
import { pageMetadata } from "@/lib/metadata";
import { contactPhoneHref } from "@/lib/site";

export const metadata = { ...pageMetadata("/contact/sent", "Message received", "Your message has reached WINJO DIGITAL."), robots: { index: false } };

/** Where the plain contact form lands after a successful send. No reply time is promised. */
export default async function SentPage({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  const { ref } = await searchParams;
  const reference = typeof ref === "string" && /^WNJO-[0-9A-F]{6}$/.test(ref) ? ref : null;
  return (
    <PageHero
      eyebrow="Message received"
      title={<>Your enquiry is with us.</>}
      lede={
        <>
          {reference ? <>Your reference is <strong>{reference}</strong>. </> : null}
          We&apos;ll read it and reply by email with questions or a next step.
        </>
      }
    >
      <div className="btn-row">
        <Link href="/" className="btn btn--primary">Back to the homepage</Link>
        {contactPhoneHref && <a href={contactPhoneHref} className="btn btn--secondary">Call us</a>}
      </div>
    </PageHero>
  );
}
