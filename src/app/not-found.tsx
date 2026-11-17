import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/Blocks";

export const metadata: Metadata = { title: "Page not found", robots: { index: false, follow: false } };

export default function NotFound() {
  return (
    <PageHero eyebrow="404" title="This page doesn't exist." lede="It may have moved, or the link may be mistyped.">
      <div className="btn-row">
        <Link href="/" className="btn btn--primary">
          Go to the homepage
        </Link>
        <Link href="/managed-websites" className="btn btn--secondary">
          Managed websites
        </Link>
        <Link href="/pricing" className="btn btn--secondary">
          Pricing
        </Link>
        <Link href="/contact" className="btn btn--secondary">
          Contact us
        </Link>
      </div>
    </PageHero>
  );
}
