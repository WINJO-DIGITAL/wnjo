import type { Metadata } from "next";
import { PageHero } from "@/components/Blocks";
import { AccountView } from "@/components/account/AccountView";

// Personal to each customer, so it stays out of search results.
export const metadata: Metadata = {
  title: "Your order",
  robots: { index: false, follow: false },
};

export default function AccountPage() {
  return (
    <>
      <PageHero
        eyebrow="Your order"
        title="Follow your website."
        lede="Sign in with the email you ordered with to see where your project is."
      />
      <section className="section--tight" style={{ paddingTop: 0 }}>
        <div className="container container--wide">
          <AccountView />
        </div>
      </section>
    </>
  );
}
