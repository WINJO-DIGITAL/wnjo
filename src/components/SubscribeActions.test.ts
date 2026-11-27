import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { SubscribeActions } from "./SubscribeActions";
import { OFFER_COOLING_OFF } from "@/lib/black-friday";

const STANDARD = "Please start work straight away. I understand that if I cancel within 14 days, I pay for the work already done.";

describe("the cooling-off box", () => {
  it("uses the offer wording on the Black Friday checkout", () => {
    const html = renderToStaticMarkup(createElement(SubscribeActions, { token: "t", mode: "pay", freeTrial: true }));
    expect(OFFER_COOLING_OFF).toBe(
      "I understand I can cancel at any time before day 15 and pay nothing. After that, my plan is rolling monthly and I can cancel any time.",
    );
    expect(html).toContain(OFFER_COOLING_OFF);
    expect(html).not.toContain("work already done");
  });

  it("leaves the standard checkout unchanged", () => {
    const html = renderToStaticMarkup(createElement(SubscribeActions, { token: "t", mode: "pay" }));
    expect(html).toContain(STANDARD);
    expect(html).not.toContain(OFFER_COOLING_OFF);
  });
});
