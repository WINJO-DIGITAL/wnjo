import type { Metadata } from "next";
import { BillingView } from "@/components/account/BillingView";

// Personal to each customer, so it stays out of search results.
export const metadata: Metadata = {
  title: "Plan & billing",
  robots: { index: false, follow: false },
};

export default function BillingPage() {
  return (
    <section className="dash-shell">
      <div className="container container--wide">
        <BillingView />
      </div>
    </section>
  );
}
