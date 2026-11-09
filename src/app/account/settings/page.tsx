import type { Metadata } from "next";
import { SettingsView } from "@/components/account/SettingsView";

export const metadata: Metadata = {
  title: "Settings",
  robots: { index: false, follow: false },
};

export default function AccountSettingsPage() {
  return (
    <section className="dash-shell">
      <div className="container container--wide">
        <SettingsView />
      </div>
    </section>
  );
}
