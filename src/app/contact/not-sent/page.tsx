import Link from "next/link";
import { PageHero } from "@/components/Blocks";
import { pageMetadata } from "@/lib/metadata";
import { contactPhoneHref } from "@/lib/site";

export const metadata = { ...pageMetadata("/contact/not-sent", "Message not sent", "Your message didn't reach WNJO."), robots: { index: false } };

const REASONS: Record<string, string> = {
  "422": "Something was missing. Please give your name, a working email address and a message of at least ten characters.",
  "429": "Too many messages came from this connection. Please wait a few minutes and try again.",
};

/** Where the plain contact form lands when a message could not be sent. Says why, and how else to reach us. */
export default async function NotSentPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const reason = (status && REASONS[status]) || "It didn't go through this time. Please try again shortly.";
  return (
    <PageHero eyebrow="Message not sent" title={<>Your message <span className="serif-em">didn&apos;t send.</span></>} lede={reason}>
      <div className="btn-row">
        <Link href="/contact" className="btn btn--primary">Try again</Link>
        {contactPhoneHref && <a href={contactPhoneHref} className="btn btn--secondary">Call us</a>}
      </div>
    </PageHero>
  );
}
