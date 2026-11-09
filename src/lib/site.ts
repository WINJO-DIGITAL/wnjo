/**
 * Site-wide facts. Only confirmed information belongs here: anything unknown
 * (contact email, social profiles, company registration) is deliberately absent
 * rather than invented. See README §15 "Open Decisions".
 */
export const site = {
  name: "WINJO DIGITAL",
  shortName: "WINJO DIGITAL",
  tagline: "More enquiries, less admin, and software that fits.",
  description:
    "WINJO DIGITAL designs and builds bespoke websites, booking systems, business automation and custom software that help businesses win more enquiries, cut repetitive admin and run on technology that fits.",
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
  /** Kept off the desktop bar so it stays uncrowded; the phone menu and the footer still list it. */
  mobileOnly?: boolean;
};

export const primaryNav: NavItem[] = [
  {
    href: "/work",
    label: "Work",
    menu: {
      primary: [
        { href: "/work", label: "All work" },
        { href: "/work#ev-exec", label: "EV Exec" },
        { href: "/work#boonma", label: "Boonma" },
        { href: "/work#fystay", label: "FYStay" },
        { href: "/work#raeng-fitness", label: "RAENG Fitness" },
      ],
      groups: [
        {
          title: "Visit the live sites",
          links: [
            { href: "https://www.evexec.co.uk", label: "evexec.co.uk", external: true },
            { href: "https://boonma.vercel.app", label: "boonma.vercel.app", external: true },
            { href: "https://www.fystay.co.uk", label: "fystay.co.uk", external: true },
            { href: "https://raengfitness.co.uk", label: "raengfitness.co.uk", external: true },
          ],
        },
      ],
    },
  },
  {
    href: "/websites",
    label: "Grow",
    also: ["/build"],
    menu: {
      primary: [
        { href: "/websites", label: "Websites that win customers" },
        { href: "/build", label: "Build my website" },
        { href: "/pricing", label: "Packages & prices" },
        { href: "/pricing#care", label: "Hosting & care" },
      ],
      groups: [
        {
          title: "Packages",
          links: [
            { href: "/pricing", label: "Essential" },
            { href: "/pricing", label: "Professional" },
            { href: "/pricing", label: "Premium" },
          ],
        },
        {
          title: "Get started",
          links: [
            { href: "/build", label: "Build my website" },
            { href: "/contact?topic=website", label: "Talk to us" },
          ],
        },
      ],
    },
  },
  {
    href: "/booking-software",
    label: "Simplify",
    menu: {
      primary: [
        { href: "/booking-software", label: "Booking systems" },
        { href: "/contact?topic=booking-software", label: "Request a demo" },
      ],
      groups: [
        {
          title: "Learn more",
          links: [
            { href: "/booking-software#apps", label: "The apps" },
            { href: "/booking-software#make-it-yours", label: "Make it yours" },
            { href: "/work#ev-exec", label: "Built for EV Exec" },
          ],
        },
      ],
    },
  },
  {
    href: "/app-development",
    label: "Build",
    menu: {
      primary: [
        { href: "/app-development", label: "Apps and bespoke software" },
        { href: "/contact?topic=bespoke", label: "Plan my app" },
      ],
      groups: [
        {
          title: "From our work",
          links: [
            { href: "/app-development#examples", label: "Examples" },
            { href: "/work#ev-exec", label: "EV Exec booking" },
            { href: "/work#fystay", label: "FYStay platform" },
          ],
        },
      ],
    },
  },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About", mobileOnly: true },
  { href: "/contact", label: "Contact", mobileOnly: true },
];

export const footerNav: { title: string; links: NavLink[] }[] = [
  {
    title: "Solutions",
    links: [
      { href: "/websites", label: "Grow: websites" },
      { href: "/booking-software", label: "Simplify: booking systems" },
      { href: "/app-development", label: "Build: apps and software" },
      { href: "/work", label: "Our work" },
    ],
  },
  {
    title: "Pricing",
    links: [
      { href: "/pricing", label: "Ways to work with us" },
      { href: "/build", label: "Build my website" },
      { href: "/pricing#care", label: "Hosting & care" },
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
