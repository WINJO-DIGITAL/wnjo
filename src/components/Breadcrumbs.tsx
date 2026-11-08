"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { breadcrumbTrail } from "@/lib/breadcrumbs";
import { articleLabels } from "@/lib/articles";

const SITE = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://winjodigital.co.uk").replace(/\/+$/, "");

/**
 * Where you are, from Home, on every internal page. Also gives search engines the same trail as structured data.
 * Rendered on the server too, so it shows without JavaScript.
 */
export function Breadcrumbs() {
  const trail = breadcrumbTrail(usePathname() ?? "/", articleLabels);
  if (!trail) return null;
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.label, item: `${SITE}${c.href}` })),
  };
  return (
    <nav aria-label="Breadcrumb" className="breadcrumbs container container--wide">
      <ol>
        {trail.map((c, i) =>
          i === trail.length - 1 ? (
            <li key={c.href} aria-current="page">{c.label}</li>
          ) : (
            <li key={c.href}>
              <Link href={c.href}>{c.label}</Link>
            </li>
          ),
        )}
      </ol>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
    </nav>
  );
}
