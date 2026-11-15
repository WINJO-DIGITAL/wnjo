import { describe, expect, it } from "vitest";
import { checkSite } from "./checks";
import { ungroundedClaims } from "./claims";
import { BARBER_PRESET } from "./presets";
import { SAMPLES } from "./sample";
import type { SiteContent } from "./schema";

const facts = SAMPLES.barber.facts;
const withIntro = (intro: string): SiteContent => {
  const c = structuredClone(SAMPLES.barber.content) as SiteContent;
  const hero = c.sections.find((s) => s.kind === "hero");
  if (hero?.kind === "hero") hero.intro = intro;
  return c;
};
const GROUNDING = ["claim-not-in-facts", "service-not-in-facts", "name-not-in-facts"];
const flagged = (intro: string) => checkSite(withIntro(intro), facts, BARBER_PRESET).issues.some((i) => GROUNDING.includes(i.code));

/** Written by hand as the kinds of claim a model makes. Each should be flagged. */
const INVENTED = [
  "We also offer beard transplants and colour correction, as well as cuts.",
  "Specialising in luxury weddings and film work.",
  "Ask for Mike, our senior barber.",
  "Led by James Carter, a former champion.",
  "Proudly serving Yorkshire.",
  "Over 25 years of experience cutting hair in Leeds.",
  "Award-winning barbers serving Leeds.",
  "Trusted by over 5,000 customers across Leeds.",
  "Our barbers are fully trained and qualified.",
  "Open 7 days a week in Leeds.",
  "We guarantee a free re-cut if you are not happy.",
  "The best barbers in Leeds, hands down.",
  "Over 20 years of expertise behind every cut.",
  "Rated 5 stars by our clients.",
  "Our number one priority is a clean cut since 2009.",
];

/**
 * Known gaps, written down so they aren't forgotten. A service named without an offer verb ("Beard transplants
 * available here.") is not read as an offer. A name in lower case ("ask for mike") isn't spotted as a name. And a
 * claim worded in a way the list doesn't know ("second to none") still gets through. Each needs real model output
 * to judge, not a guess at the wording.
 */
export const KNOWN_GAPS = ["Beard transplants available here.", "Ask for mike, our senior barber.", "A shop that is simply unmatched."];

/** Written by hand as honest lines from the customer's own facts. None should be flagged. */
const GROUNDED = [
  "We offer cuts, shaves and beard trims.",
  "Skin fades and hot towel shaves in Leeds.",
  "Including cuts and shaves.",
  "Call us on 01632 960123.",
  "Hours are Monday to Friday and Saturday.",
  "A family barber shop on the high street.",
  "Cuts, shaves and beard work in Leeds.",
  "Walk-ins and bookings are welcome at Hartley & Sons.",
  "Sharp cuts from a team that takes its time.",
  "Call us to book your next cut.",
  "Open Monday to Friday, 9 till 6, and Saturday until 4.",
];

describe("claims in the wording", () => {
  it("flags every invented claim in the hand-written set", () => {
    const missed = INVENTED.filter((line) => !flagged(line));
    expect(missed).toEqual([]);
  });
  it("lets every honest line through", () => {
    const wrongly = GROUNDED.filter((line) => flagged(line));
    expect(wrongly).toEqual([]);
  });
  it("doesn't let a word in the question the customer answered count as their own", () => {
    // "best" is in the question label "What are you best known for?", which is ours, not the customer's.
    expect(flagged("The best barbers in Leeds, hands down.")).toBe(true);
  });
  it("is honest about what it doesn't catch yet", () => {
    expect(KNOWN_GAPS.every((line) => !flagged(line))).toBe(true);
  });
  it("allows a claim the customer wrote themselves", () => {
    const own = { ...facts, about: "Award-winning barbers since 2009, with 25 years of experience." };
    const c = withIntro("Award-winning barbers since 2009, with 25 years of experience.");
    expect(checkSite(c, own, BARBER_PRESET).issues.some((i) => i.code === "claim-not-in-facts")).toBe(false);
  });
  it("names the claim and the number so the model can be told what to remove", () => {
    const r = ungroundedClaims("Over 25 years of experience.", "A family barber shop.");
    expect(r).toEqual(expect.arrayContaining(["years", "experience", "25"]));
  });
  it("ignores case and punctuation in the customer's words", () => {
    expect(ungroundedClaims("Award-winning.", "AWARD WINNING shop")).toEqual([]);
  });
});
