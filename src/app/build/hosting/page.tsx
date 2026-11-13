import { PageHero } from "@/components/Blocks";
import { HostingRequest } from "@/components/configurator/HostingRequest";
import { pageMetadata } from "@/lib/metadata";
import { CARE_PLANS, formatGBP } from "@/lib/pricing";

export const metadata = pageMetadata(
  "/build/hosting",
  "Hosting only",
  `Managed hosting for your website from ${formatGBP(CARE_PLANS.hosting.monthly)} a month. Choose a plan, tell us where your website is up to and start online.`,
);

export default function HostingPage() {
  return (
    <>
      <PageHero
        eyebrow="Hosting only"
        title={<>Hosting that looks after itself.</>}
        lede={`Managed hosting, security and support for your website, from ${formatGBP(CARE_PLANS.hosting.monthly)} a month.`}
      />
      <section className="section--tight" style={{ paddingTop: 0 }}>
        <div className="container container--wide">
          <div className="js-only">
            <HostingRequest />
          </div>
          <noscript>
            <p className="lede">
              This form needs JavaScript. You can <a href="/contact?topic=website">send us a message</a> instead, and we&apos;ll come back to
              you about hosting.
            </p>
          </noscript>
        </div>
      </section>
    </>
  );
}
