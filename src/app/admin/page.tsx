import type { Metadata } from "next";
import { AdminView } from "@/components/admin/AdminView";

// Agency staff only. Kept out of search results.
export const metadata: Metadata = {
  title: "Agency admin",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <section className="section--tight" style={{ paddingTop: "var(--space-6)" }}>
      <div className="container container--wide">
        <AdminView />
      </div>
    </section>
  );
}
