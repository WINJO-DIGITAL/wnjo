import type { Metadata } from "next";
import { AccountView } from "@/components/account/AccountView";

// Personal to each customer, so it stays out of search results.
export const metadata: Metadata = {
  title: "Your order",
  robots: { index: false, follow: false },
};

export default function AccountPage() {
  return (
    <section className="dash-shell">
      <div className="container container--wide">
        <AccountView />
      </div>
    </section>
  );
}
