import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { maskEmail, PaymentConfirmed, type ConfirmedOrder } from "./PaymentConfirmed";

const order: ConfirmedOrder = {
  reference: "WS-A1B2C3",
  kind: "subscription",
  package_name: "Plus",
  email: "sam@harbourbakery.co.uk",
  setup_pence: 14900,
  monthly_pence: 14900,
  one_off_pence: 0,
  minimum_term_months: 12,
};

describe("payment confirmation", () => {
  it("shows the confirmation number, the package, what was paid, and what comes next", () => {
    const html = renderToStaticMarkup(createElement(PaymentConfirmed, {order: order, paidOn: new Date("2026-11-10T09:00:00Z"),}));
    expect(html).toContain("WS-A1B2C3");
    expect(html).toContain("Plus");
    expect(html).toContain("£298");
    expect(html).toContain("£149 a month, 12-month minimum term");
    expect(html).toContain("10 November 2026");
    expect(html).toContain("What happens next");
    expect(html).toContain("Go to your account");
  });

  it("never shows the customer's full email address", () => {
    const html = renderToStaticMarkup(createElement(PaymentConfirmed, {order: order,}));
    expect(html).toContain("s***@harbourbakery.co.uk");
    expect(html).not.toContain("sam@harbourbakery.co.uk");
  });

  it("shows a one-off payment without a monthly line", () => {
    const html = renderToStaticMarkup(createElement(PaymentConfirmed, {order: { ...order, kind: "one_off", monthly_pence: 0, setup_pence: 0, one_off_pence: 50000 },}));
    expect(html).toContain("£500");
    expect(html).not.toContain("minimum term");
  });

  it("still thanks the customer and says what happens next when the order can't be found", () => {
    const html = renderToStaticMarkup(createElement(PaymentConfirmed, {order: null,}));
    expect(html).toContain("What happens next");
    expect(html).not.toContain("Confirmation number");
  });

  it("masks an email without an @", () => {
    expect(maskEmail("nope")).toBe("your email address");
  });
});
