import { PageHero } from "@/components/Blocks";
import { ProjectRequest } from "@/components/configurator/ProjectRequest";
import { pageMetadata } from "@/lib/metadata";
import { ONE_OFF_WEBSITE, formatGBP } from "@/lib/pricing";

export const metadata = pageMetadata(
  "/build/project",
  "Buy your website outright",
  `A bespoke website from ${formatGBP(ONE_OFF_WEBSITE.from)}, yours on full payment. Tell us what you need and we'll send a written proposal.`,
);

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function ProjectPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  return (
    <>
      <PageHero
        eyebrow="Website project"
        title={<>Buy your website outright.</>}
        lede="A few answers, then a written proposal. Nothing is charged until you accept it."
      />
      <section className="section--tight" style={{ paddingTop: 0 }}>
        <div className="container container--wide">
          <div className="js-only">
            <ProjectRequest pages={first(query.pages)} care={first(query.care)} />
          </div>
          <noscript>
            <p className="lede">
              This form needs JavaScript. You can <a href="/contact?topic=website">send us a message</a> instead, and we&apos;ll
              come back to you with a proposal.
            </p>
          </noscript>
        </div>
      </section>
    </>
  );
}
