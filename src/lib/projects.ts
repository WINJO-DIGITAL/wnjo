import type { StaticImageData } from "next/image";
import boonmaDesktop from "../../public/work/boonma-desktop.webp";
import boonmaMobile from "../../public/work/boonma-mobile.webp";
import boonmaPage from "../../public/work/boonma-page.webp";
import boonmaTablet from "../../public/work/boonma-tablet.webp";
import evexecDesktop from "../../public/work/evexec-desktop.webp";
import evexecMobile from "../../public/work/evexec-mobile.webp";
import evexecPage from "../../public/work/evexec-page.webp";
import evexecTablet from "../../public/work/evexec-tablet.webp";
import fystayDesktop from "../../public/work/fystay-desktop.webp";
import fystayMobile from "../../public/work/fystay-mobile.webp";
import fystayPage from "../../public/work/fystay-page.webp";
import fystayTablet from "../../public/work/fystay-tablet.webp";
import raengDesktop from "../../public/work/raeng-desktop.webp";
import raengMobile from "../../public/work/raeng-mobile.webp";
import raengTablet from "../../public/work/raeng-tablet.webp";
import raengPage from "../../public/work/raeng-page.webp";
import raengLogo from "../../public/work/logos/raeng-fitness.png";
import boonmaLogo from "../../public/work/logos/boonma.png";
import evexecLogo from "../../public/work/logos/ev-exec.png";
import fystayLogo from "../../public/work/logos/fystay.png";

/**
 * Portfolio entries. Every project here was designed and built by WNJO (confirmed
 * by the owner). Descriptions state only what the live site itself shows: no invented
 * outcomes, metrics or testimonials (README §5, §15). Screenshots are of the live sites.
 */
export const INDUSTRIES = [
  { id: "hospitality", label: "Hospitality" },
  { id: "beauty", label: "Beauty" },
  { id: "transport", label: "Transport" },
  { id: "other", label: "Other" },
] as const;
export type Industry = (typeof INDUSTRIES)[number]["id"];

export type Project = {
  slug: string;
  name: string;
  /** "client" for work built for a business; "product" for platforms WNJO runs. */
  kind: "client" | "product";
  sector: string;
  /** The portfolio filter group: the kind of business, for visitors looking for work like theirs. */
  industry: Industry;
  location: string;
  /** One line: what the business or product is. */
  summary: string;
  /** The need the project addressed, phrased from what the business does. No invented history. */
  challenge: string;
  /** Our approach, in a sentence or two. */
  solution: string;
  /** What we built, as visible on the live site. */
  built: string[];
  url: string;
  host: string;
  desktop: StaticImageData;
  mobile: StaticImageData;
  /** Portrait tablet capture (3:4), used by the phone-sized hero's Tablet view. */
  tablet: StaticImageData;
  /** The business's own logo, as a square tile (used with the owner's permission). */
  logo: StaticImageData;
  /** Full-page capture, used for hover-to-scroll previews. */
  page: StaticImageData;
  /** A short clip browsing the full page (cursor, clicks, scrolling), rendered from the capture. */
  walkthrough: { mp4: string; webm: string; poster: string };
  /** Short note on the visual identity, to show the range of bespoke work. */
  identity: string;
};

export const projects: Project[] = [
  {
    slug: "ev-exec",
    name: "EV Exec",
    kind: "client",
    sector: "Executive airport transfers",
    industry: "transport",
    location: "Blackpool & Fylde Coast",
    summary:
      "Fixed-price executive transfers to every UK airport in electric vehicles. The business our driver and operator software was developed for.",
    challenge:
      "Airport transfer customers want a fixed price and a booking they can trust before they travel, and every job needs capturing accurately, including flight details, extra stops and returns.",
    solution:
      "A calm, executive website built around a three-step booking flow, with published fixed prices for every UK airport and customer accounts, alongside driver and operator software developed for the business.",
    built: [
      "Three-step online booking with returns, extra stops and flight details",
      "Customer accounts and booking look-up by reference",
      "Published fixed airport prices and a quote request flow",
      "Area pages across the Fylde Coast",
    ],
    url: "https://www.evexec.co.uk",
    host: "evexec.co.uk",
    desktop: evexecDesktop,
    mobile: evexecMobile,
    tablet: evexecTablet,
    logo: evexecLogo,
    page: evexecPage,
    walkthrough: {
      mp4: "/work/evexec-walkthrough.mp4",
      webm: "/work/evexec-walkthrough.webm",
      poster: "/work/evexec-walkthrough.webp",
    },
    identity: "Dark, executive and calm, with gold used sparingly for action.",
  },
  {
    slug: "boonma",
    name: "Boonma",
    kind: "client",
    sector: "Traditional Thai massage",
    industry: "beauty",
    location: "Wallasey, Wirral",
    summary: "An independent Thai massage studio, presented with the warmth and calm of the treatment room.",
    challenge:
      "A traditional Thai massage studio wanted its website to feel like the treatment room, and booking to be simple enough that customers never need to create an account.",
    solution:
      "A warm, editorial site with clear treatments and prices, a gallery and reviews, and a booking flow where customers simply pick a treatment and a time.",
    built: [
      "Treatments and a clear price list",
      "Online booking: pick a treatment and a time, no account needed",
      "Gallery, reviews and the studio's story",
      "Essential-only cookies, with no tracking or advertising",
    ],
    url: "https://boonma.vercel.app",
    host: "boonma.vercel.app",
    desktop: boonmaDesktop,
    mobile: boonmaMobile,
    tablet: boonmaTablet,
    logo: boonmaLogo,
    page: boonmaPage,
    walkthrough: {
      mp4: "/work/boonma-walkthrough.mp4",
      webm: "/work/boonma-walkthrough.webm",
      poster: "/work/boonma-walkthrough.webp",
    },
    identity: "Warm editorial serif, soft ivory and a deep plum accent.",
  },
  {
    slug: "raeng-fitness",
    name: "RAENG Fitness",
    kind: "client",
    sector: "Kettlebell training",
    industry: "other",
    location: "Cumbernauld",
    summary: "Kettlebell classes, one-to-one and small group coaching, and memberships from a studio in Cumbernauld.",
    challenge:
      "A kettlebell studio needed one place to show its classes and coaching, and to let people book a class or buy a membership online.",
    solution:
      "A bold, dark website led by training photography, with the class timetable, prices and membership plans shown up front and booking built in.",
    built: [
      "Class timetable with booking",
      "Group, one-to-one and small group coaching, each with its price",
      "Four membership plans and pay-as-you-go pricing",
    ],
    url: "https://raengfitness.co.uk",
    host: "raengfitness.co.uk",
    desktop: raengDesktop,
    mobile: raengMobile,
    tablet: raengTablet,
    logo: raengLogo,
    page: raengPage,
    walkthrough: {
      mp4: "/work/raeng-walkthrough.mp4",
      webm: "/work/raeng-walkthrough.webm",
      poster: "/work/raeng-walkthrough.webp",
    },
    identity: "Heavy uppercase sans on black training photography, with cream for the light areas.",
  },
  {
    slug: "fystay",
    name: "FYStay",
    kind: "product",
    sector: "Holiday stays platform",
    industry: "hospitality",
    location: "Blackpool & the Fylde Coast",
    summary:
      "Our own platform for independent holiday homes, apartments and guest houses from local hosts, with the full price shown before you book.",
    challenge:
      "We wanted to give independent Fylde Coast hosts a local place to list their stays, with the full price shown to guests before they book.",
    solution:
      "Our own stays platform, with search by town, dates and guests, local guides for each town, airport transfers that can be added to a booking, and a dashboard for hosts.",
    built: [
      "Stay search by town, dates and guests",
      "Town-by-town local guides and experiences",
      "Airport transfers added to a confirmed booking",
      "Host listings and a host dashboard",
    ],
    url: "https://www.fystay.co.uk",
    host: "fystay.co.uk",
    desktop: fystayDesktop,
    mobile: fystayMobile,
    tablet: fystayTablet,
    logo: fystayLogo,
    page: fystayPage,
    walkthrough: {
      mp4: "/work/fystay-walkthrough.mp4",
      webm: "/work/fystay-walkthrough.webm",
      poster: "/work/fystay-walkthrough.webp",
    },
    identity: "Seaside warmth: terracotta, sand and an app-like mobile tab bar.",
  },
];

export const projectBySlug = (slug: string) => projects.find((p) => p.slug === slug);

/** The work pieces the homepage hero shows, in order. */
export const heroProjects: Project[] = [
  projectBySlug("ev-exec")!,
  projectBySlug("boonma")!,
  projectBySlug("raeng-fitness")!,
];

/**
 * Each owner's own words, approved by them; keep them true to how the business runs today.
 * One source for the homepage's quotes section and the phone hero. FYStay (ours) has no quote.
 * `pull` is one sentence lifted word for word from the quote, shown large; never reword it (a test checks).
 */
export const OWNER_QUOTES = [
  {
    project: projectBySlug("ev-exec")!,
    quote:
      "Customers book their airport transfer on their phone in a minute, and I get the job straight away. It runs the business while I\u2019m driving.",
    pull: "It runs the business while I\u2019m driving.",
  },
  {
    project: projectBySlug("boonma")!,
    quote:
      "Clients find a treatment, see the price and book a time, all from their phone. It feels like our studio.",
    pull: "It feels like our studio.",
  },
  {
    project: projectBySlug("raeng-fitness")!,
    quote:
      "From the first look, the website feels professional and looks class. It gives the business a great online presence, gets people talking and makes it easy to start attracting new clients.",
    pull: "From the first look, the website feels professional and looks class.",
  },
];
