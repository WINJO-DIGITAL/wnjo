/**
 * Site-wide facts. Only confirmed information belongs here: anything unknown
 * (contact email, social profiles, company registration) is deliberately absent
 * rather than invented. See README §15 "Open Decisions".
 */
export const site = {
  name: "WINJO DIGITAL",
  shortName: "WINJO DIGITAL",
  tagline: "Your website. Our responsibility.",
  description:
    "WINJO DIGITAL builds, hosts, maintains and updates bespoke business websites for one predictable monthly payment, from £99 a month. Rolling monthly, with no minimum term.",
  locale: "en_GB",
  themeColor: "#F2ECE2",
} as const;

/**
 * Production origin, e.g. https://example.com. Unset until the domain is confirmed.
 * On Vercel, the project's production URL is used as a fallback.
 */
export function siteUrl(): string | undefined {
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim() || (vercel ? `https://${vercel}` : undefined);
  if (!raw) return undefined;
  try {
    return new URL(raw).origin;
  } catch {
    return undefined;
  }
}

export type NavLink = { href: string; label: string; external?: boolean };

export type NavMenu = {
  /** Large links, shown first. */
  primary: NavLink[];
  /** Smaller grouped links beside (desktop) or below (mobile) the primary links. */
  groups: { title: string; links: NavLink[] }[];
};

export type NavItem = NavLink & {
  menu?: NavMenu;
  /** Other paths that belong to this section, for the current-section indicator. */
  also?: string[];
  /** Paths that belong to a different section even though `also` would match them. */
  not?: string[];
  /** Kept off the desktop bar so it stays uncrowded; the phone menu and the footer still list it. */
  mobileOnly?: boolean;
};

export const primaryNav: NavItem[] = [
  {
    href: "/managed-websites",
    label: "Managed websites",
    also: ["/build", "/winjo-refresh"],
    not: ["/build/project", "/build/hosting"],
    menu: {
      primary: [
        { href: "/managed-websites", label: "How it works" },
        { href: "/pricing", label: "Plans and pricing" },
        { href: "/winjo-refresh", label: "WINJO Refresh" },
        { href: "/website-projects", label: "Own your website" },
        { href: "/faq", label: "Questions" },
      ],
      groups: [],
    },
  },
  { href: "/pricing", label: "Pricing" },
  {
    href: "/website-projects",
    label: "Services",
    also: ["/booking-software", "/app-development", "/build/project", "/build/hosting"],
    menu: {
      primary: [
        { href: "/website-projects", label: "Own your website" },
        { href: "/booking-software", label: "Booking systems" },
        { href: "/app-development", label: "Apps & software" },
      ],
      groups: [],
    },
  },
  {
    href: "/work",
    label: "Our work",
    menu: {
      primary: [
        { href: "/work", label: "All work" },
        { href: "/work#ev-exec", label: "EV Exec" },
        { href: "/work#boonma", label: "Boonma" },
        { href: "/work#raeng-fitness", label: "RAENG Fitness" },
        { href: "/work#fystay", label: "FYStay" },
      ],
      groups: [],
    },
  },
  { href: "/about", label: "About" },
  { href: "/website-projects", label: "Website projects", also: ["/build/project", "/build/hosting"], mobileOnly: true },
  { href: "/contact", label: "Contact", mobileOnly: true },
];

/**
 * The phone menu, in sections. Each entry is a link, or opens a short list of its own. The flat order of the items is
 * the order they are numbered in, so keep it in step with what is shown.
 */
export const mobileNav: { label: string; items: NavItem[] }[] = [
  {
    label: "What we do",
    items: [
      {
        href: "/managed-websites",
        label: "Websites",
        also: ["/build", "/winjo-refresh", "/pricing"],
        not: ["/build/project", "/build/hosting"],
        menu: {
          primary: [
            { href: "/managed-websites", label: "How it works" },
            { href: "/pricing", label: "Plans and pricing" },
            { href: "/winjo-refresh", label: "WINJO Refresh" },
            { href: "/website-projects", label: "Own your website" },
            { href: "/faq", label: "Questions" },
          ],
          groups: [],
        },
      },
      {
        href: "/booking-software",
        label: "Booking systems",
        menu: {
          primary: [
            { href: "/booking-software", label: "About booking systems" },
            { href: "/contact?topic=booking-software", label: "Request a demo" },
          ],
          groups: [],
        },
      },
      {
        href: "/app-development",
        label: "Apps & software",
        menu: {
          primary: [
            { href: "/app-development", label: "About apps and software" },
            { href: "/contact?topic=bespoke", label: "Plan my app" },
          ],
          groups: [],
        },
      },
    ],
  },
  {
    label: "Discover WINJO",
    items: [
      {
        href: "/work",
        label: "Our work",
        menu: {
          primary: [
            { href: "/work", label: "All work" },
            { href: "/work#ev-exec", label: "EV Exec" },
            { href: "/work#boonma", label: "Boonma" },
            { href: "/work#raeng-fitness", label: "RAENG Fitness" },
            { href: "/work#fystay", label: "FYStay" },
          ],
          groups: [],
        },
      },
      { href: "/pricing", label: "Pricing" },
      { href: "/about", label: "About" },
      { href: "/contact", label: "Contact" },
    ],
  },
];

export const footerNav: { title: string; links: NavLink[] }[] = [
  {
    title: "Managed websites",
    links: [
      { href: "/managed-websites", label: "How it works" },
      { href: "/pricing", label: "Pricing" },
      { href: "/winjo-refresh", label: "WINJO Refresh" },
      { href: "/work", label: "Our work" },
    ],
  },
  {
    title: "Other services",
    links: [
      { href: "/website-projects", label: "Website projects" },
      { href: "/booking-software", label: "Booking systems" },
      { href: "/app-development", label: "Apps and software" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/faq", label: "FAQ" },
      { href: "/resources", label: "Resources" },
      { href: "/contact", label: "Contact" },
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
      { href: "/cookies", label: "Cookies" },
      { href: "/account", label: "Client sign-in" },
    ],
  },
];

/**
 * The business telephone number, shown only as a "Call us" button, never as digits. Confirmed by the owner as the
 * work number. The environment value (NEXT_PUBLIC_CONTACT_PHONE) can override it.
 */
const CONTACT_PHONE_PLACEHOLDER = "07474 144 600";
export const contactPhoneHref: string | null = (() => {
  const raw = process.env.NEXT_PUBLIC_CONTACT_PHONE?.trim() || CONTACT_PHONE_PLACEHOLDER;
  const digits = raw.replace(/[^\d+]/g, "");
  const international = digits.startsWith("+") ? digits : digits.replace(/^0/, "+44");
  return /^\+\d{8,15}$/.test(international) ? `tel:${international}` : null;
})();
