import type { DayAnswer, RawAnswers } from "./site-template/answers";
import { PROFILE_LIMITS, type BusinessProfile } from "./website-brief";

/**
 * Switching the kind of business must never cost the customer what they typed. A template type keeps its answers in
 * `site.answers`; "Another type of business" keeps them in `profile`. These carry what both ask for from the form being
 * left into the one being opened. The form being left holds the newest typing, so its answers win; an empty answer
 * never blanks one that is filled in. What only one side asks for (an address, a WhatsApp number, ticked facts) is set
 * aside by the wizard and put back if they switch again.
 */

/** The first answer that has anything in it. */
const first = (...values: (string | undefined)[]) => values.find((v) => v && v.trim()) ?? "";

/** The opening times as one line: "Mon 09:00-17:00, Tue 09:00-17:00, Sat closed". Days with nothing entered are left out. */
export function hoursText(hours: DayAnswer[] | undefined): string {
  return (hours ?? [])
    .flatMap((d) => (d.closed ? [`${d.day} closed`] : d.open && d.close ? [`${d.day} ${d.open}-${d.close}`] : []))
    .join(", ")
    .slice(0, PROFILE_LIMITS.hours);
}

/** The first part of a sentence or two, cut at a word, to fit a shorter box. */
export function shorten(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const space = cut.lastIndexOf(" ");
  return (space > max / 2 ? cut.slice(0, space) : cut).trim();
}

/** A template type's answers, carried into the generic business details. */
export function carryToProfile(answers: RawAnswers | undefined, profile: BusinessProfile): BusinessProfile {
  if (!answers) return profile;
  const about = (answers.about ?? "").trim();
  return {
    ...profile,
    services: first(answers.servicesText, profile.services).slice(0, PROFILE_LIMITS.services),
    phone: first(answers.phone, profile.phone).slice(0, PROFILE_LIMITS.phone),
    email: first(answers.email, profile.email).slice(0, PROFILE_LIMITS.email),
    areas: first(answers.areas, profile.areas).slice(0, PROFILE_LIMITS.areas),
    hours: first(hoursText(answers.hours), profile.hours).slice(0, PROFILE_LIMITS.hours),
    // The short box takes the start of it; the long "about" box keeps all of it.
    differentiator: about ? shorten(about, PROFILE_LIMITS.differentiator) : profile.differentiator,
    about: about ? about.slice(0, PROFILE_LIMITS.about) : profile.about,
  };
}

/** The generic business details, carried into a template type's answers (on top of any set aside earlier). */
export function carryToAnswers(profile: BusinessProfile, answers: RawAnswers | undefined): RawAnswers {
  const a = answers ?? {};
  const short = profile.differentiator.trim();
  // The answers already hold the full text when the short one is just its start: only a changed one replaces it.
  const keepsFull = Boolean(a.about && short && a.about.trim().startsWith(short));
  const about = !short ? first(a.about, profile.about) : keepsFull ? (a.about as string) : short;
  return {
    ...a,
    servicesText: first(profile.services, a.servicesText),
    phone: first(profile.phone, a.phone),
    email: first(profile.email, a.email),
    areas: first(profile.areas, a.areas),
    about: about.slice(0, 400),
  };
}
