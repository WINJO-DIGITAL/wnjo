import { PageHero } from "@/components/Blocks";
import { Configurator, type ConfiguratorParams } from "@/components/configurator/Configurator";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata(
  "/build",
  "Build your website",
  "Configure your website in a few steps and see an indicative price immediately, with inclusions, exclusions and ongoing costs set out clearly.",
);

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function BuildPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const params: ConfiguratorParams = {
    type: first(query.type),
    pages: first(query.pages),
    care: first(query.care),
    business: first(query.business),
  };
  return (
    <>
      <PageHero
        eyebrow="Website configurator"
        title={<>Build <span className="serif-em">your website.</span></>}
        lede="A few quick answers, and your written quote arrives instantly. Nothing is charged."
      />
      <section className="section--tight" style={{ paddingTop: 0 }}>
        <div className="container container--wide">
          <div className="js-only">
            <Configurator params={params} />
          </div>
          <noscript>
            <p className="lede">
              The price calculator needs JavaScript. You can <a href="/contact">send us a message</a> instead, and we&apos;ll
              come back to you with a price.
            </p>
          </noscript>
        </div>
      </section>
    </>
  );
}
