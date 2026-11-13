/** Names for each public page, used for breadcrumbs. Pages not listed (and the dashboards) get no breadcrumb. */
const LABELS: Record<string, string> = {
  "/managed-websites": "Managed websites",
  "/winjo-refresh": "WINJO Refresh",
  "/website-projects": "Website projects",
  "/build": "Get started",
  "/build/project": "Own your website",
  "/build/hosting": "Hosting only",
  "/booking-software": "Booking software",
  "/app-development": "App development",
  "/work": "Our work",
  "/about": "About",
  "/contact": "Contact",
  "/contact/sent": "Message received",
  "/contact/not-sent": "Message not sent",
  "/faq": "FAQ",
  "/pricing": "Pricing",
  "/privacy": "Privacy",
  "/terms": "Terms",
  "/cookies": "Cookies",
  "/resources": "Resources",
};

export type Crumb = { href: string; label: string };

/**
 * The trail from Home to the current page, or null where no breadcrumb belongs (the homepage, dashboards and
 * unknown pages). Each level of the path that has a name becomes a crumb.
 */
export function breadcrumbTrail(path: string, extra: Record<string, string> = {}): Crumb[] | null {
  const clean = path.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  if (clean === "/") return null;
  // The buy-outright form sits under Website projects, not under the plan flow.
  if (clean === "/build/project" || clean === "/build/hosting") return [{ href: "/", label: "Home" }, { href: "/website-projects", label: "Website projects" }, { href: clean, label: LABELS[clean] }];
  const labels = { ...LABELS, ...extra };
  const parts = clean.split("/").filter(Boolean);
  const trail: Crumb[] = [{ href: "/", label: "Home" }];
  for (let i = 0; i < parts.length; i++) {
    const href = "/" + parts.slice(0, i + 1).join("/");
    const label = labels[href];
    if (!label) return null;
    trail.push({ href, label });
  }
  return trail;
}
