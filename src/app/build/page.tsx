import { redirect } from "next/navigation";
import { PageHero } from "@/components/Blocks";
import {
  WebsiteConfigurator,
  type WebsiteConfiguratorParams,
} from "@/components/configurator/WebsiteConfigurator";
import { isPlanlessBuild, isShortCheckout } from "@/lib/short-checkout";
import { pageMetadata } from "@/lib/metadata";
import { ONE_OFF_WEBSITE, WEBSITE_PLANS, formatGBP } from "@/lib/pricing";

export const metadata = pageMetadata(
  "/build",
  "Get started",
  `Choose your plan and tell us about your business in a few steps: managed websites from ${formatGBP(WEBSITE_PLANS.bronze.monthly)} a month with no minimum term, or a website project from ${formatGBP(ONE_OFF_WEBSITE.from)}. Your price is shown as you go.`,
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
    draft: first(query.draft),
    full: first(query.full),
  };
  // A bare /build would open the form on Core £99 as if chosen; the plans are where that choice is made.
  if (isPlanlessBuild(params)) redirect("/pricing#plans");
  // Consultation booking appears only once a real calendar is connected (Cal.com); until then, callbacks.
  const calendarEnabled = Boolean(process.env.CALCOM_API_KEY?.trim() && process.env.CALCOM_EVENT_TYPE_ID?.trim());
  const short = isShortCheckout(params);
  return (
    <>
      <PageHero
        eyebrow="Get started"
        title={short ? <>Start your website.</> : <>Let&apos;s get your website started.</>}
        lede={short ? "Enter your name and email, then pay securely. We ask about your business and design after." : `Choose a plan and tell us about your business. From ${formatGBP(WEBSITE_PLANS.bronze.monthly)} a month, with no minimum term. Nothing is charged until you agree to go ahead.`}
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
