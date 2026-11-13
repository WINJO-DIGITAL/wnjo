import Link from "next/link";
import { PageHero } from "@/components/Blocks";
import { Faq } from "@/components/Faq";
import { faqs } from "@/lib/faq";
import { pageMetadata } from "@/lib/metadata";
import { faqSchema } from "@/lib/structured-data";

export const metadata = pageMetadata(
  "/faq",
  "Managed website questions and answers",
  "Answers about managed websites: what each plan costs, the rolling monthly subscription, who owns what, WINJO Refresh and what happens if you leave.",
);

export default function FaqPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema(faqs)).replace(/</g, "\\u003c") }} />
      <PageHero
        eyebrow="FAQ"
        title={
          <>
            Questions, answered.
          </>
        }
        lede={
          <>
            Anything else? <Link href="/contact?topic=other">Ask us directly</Link>.
          </>
        }
      />
      <section className="section--tight" style={{ paddingTop: 0 }}>
        <div className="container container--wide" style={{ maxWidth: "64rem" }}>
          <Faq />
        </div>
      </section>
    </>
  );
}
