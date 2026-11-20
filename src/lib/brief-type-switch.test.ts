import { describe, expect, it } from "vitest";
import { carryToAnswers, carryToProfile, hoursText, shorten } from "./brief-type-switch";
import { EMPTY_PROFILE } from "./website-brief";

describe("switching the kind of business", () => {
  it("carries a template type's answers into the generic details", () => {
    const p = carryToProfile(
      { servicesText: "Support sessions £40", phone: "01700 900123", email: "a@b.co", areas: "Preston", about: "Run by people with lived experience.", hours: [{ day: "Mon", open: "09:00", close: "17:00" }, { day: "Sun", closed: true }, { day: "Tue", open: "", close: "" }] },
      EMPTY_PROFILE,
    );
    expect(p).toMatchObject({ services: "Support sessions £40", phone: "01700 900123", email: "a@b.co", areas: "Preston", differentiator: "Run by people with lived experience.", about: "Run by people with lived experience.", hours: "Mon 09:00-17:00, Sun closed" });
  });

  it("the form being left has the newest typing, so its answers win, and an empty one never blanks a filled one", () => {
    const p = carryToProfile({ servicesText: "Newer, from the template", phone: "" }, { ...EMPTY_PROFILE, services: "Older", phone: "222" });
    expect(p.services).toBe("Newer, from the template");
    expect(p.phone).toBe("222");
    const a = carryToAnswers({ ...EMPTY_PROFILE, services: "Newer, from the generic form", email: "" }, { servicesText: "Older", email: "kept@y.co" });
    expect(a.servicesText).toBe("Newer, from the generic form");
    expect(a.email).toBe("kept@y.co");
  });

  it("a long answer comes back whole after a round trip through the short box, and a changed short one replaces it", () => {
    const long = "A small team run by people with lived experience of autism, offering practical support that fits each family and school. ".repeat(3).trim();
    const asProfile = carryToProfile({ about: long }, EMPTY_PROFILE);
    expect(asProfile.differentiator.length).toBeLessThanOrEqual(200);
    expect(carryToAnswers(asProfile, { about: long }).about).toBe(long.slice(0, 400));
    expect(carryToAnswers({ ...asProfile, differentiator: "Something new I wrote" }, { about: long }).about).toBe("Something new I wrote");
  });

  it("carries the generic details into a template type's answers", () => {
    const a = carryToAnswers({ ...EMPTY_PROFILE, services: "Cuts", phone: "01", differentiator: "Family run since 2012" }, undefined);
    expect(a).toMatchObject({ servicesText: "Cuts", phone: "01", about: "Family run since 2012" });
  });

  it("keeps the answers it was given when nothing is there to carry", () => {
    expect(carryToProfile(undefined, EMPTY_PROFILE)).toBe(EMPTY_PROFILE);
    expect(carryToAnswers(EMPTY_PROFILE, { address: "12 Test Street" }).address).toBe("12 Test Street");
  });

  it("fits a long answer into a shorter box at a word", () => {
    const long = "word ".repeat(80).trim();
    const short = shorten(long, 200);
    expect(short.length).toBeLessThanOrEqual(200);
    expect(short.endsWith("word")).toBe(true);
    expect(hoursText(undefined)).toBe("");
  });
});
