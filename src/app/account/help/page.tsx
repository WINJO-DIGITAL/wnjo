import type { Metadata } from "next";
import { HelpView } from "@/components/account/HelpView";

// Personal to each customer, so it stays out of search results.
export const metadata: Metadata = {
  title: "Help",
  robots: { index: false, follow: false },
};

export default function AccountHelpPage() {
  return (
    <section className="dash-shell">
      <div className="container container--wide">
        <HelpView />
      </div>
    </section>
  );
}
