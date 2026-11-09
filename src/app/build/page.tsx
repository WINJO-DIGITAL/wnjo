import { PageHero } from "@/components/Blocks";
import {
  WebsiteConfigurator,
  type WebsiteConfiguratorParams,
} from "@/components/configurator/WebsiteConfigurator";
import { pageMetadata } from "@/lib/metadata";
import { ONE_OFF_WEBSITE, WEBSITE_PLANS, formatGBP } from "@/lib/pricing";

export const metadata = pageMetadata(
  "/build",
  "Build my website",
  `Build your website brief and see your price in a few steps: monthly websites from ${formatGBP(WEBSITE_PLANS.bronze.monthly)} or a one-off bespoke website from ${formatGBP(ONE_OFF_WEBSITE.from)}, with your first payment and monthly price shown as you go.`,
);

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function BuildPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const params: WebsiteConfiguratorParams = {
    plan: first(query.plan),
    type: first(query.type),
    care: first(query.care),
    pages: first(query.pages),
    business: first(query.business),
  };
  // Consultation booking appears only once a real calendar is connected (Cal.com); until then, callbacks.
  const calendarEnabled = Boolean(process.env.CALCOM_API_KEY?.trim() && process.env.CALCOM_EVENT_TYPE_ID?.trim());
  return (
    <>
      <PageHero
        eyebrow="Build my website"
        title={<>Build your website.</>}
        lede={`From ${formatGBP(WEBSITE_PLANS.bronze.monthly)} a month or ${formatGBP(ONE_OFF_WEBSITE.from)} up front. Your price updates as you go. Nothing is charged.`}
      />
      <section className="section--tight" style={{ paddingTop: 0 }}>
        <div className="container container--wide">
          <div className="js-only">
            <WebsiteConfigurator params={params} calendarEnabled={calendarEnabled} />
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
