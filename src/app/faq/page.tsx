import Link from "next/link";
import { PageHero } from "@/components/Blocks";
import { Faq } from "@/components/Faq";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata(
  "/faq",
  "Questions",
  "Answers on timings, revisions, payments, ownership, support after launch and building apps with WNJO.",
);

export default function FaqPage() {
  return (
    <>
      <PageHero
        eyebrow="FAQ"
        title={
          <>
            Questions, <span className="serif-em">answered.</span>
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
