import { describe, expect, it } from "vitest";
import { breadcrumbTrail } from "@/lib/breadcrumbs";

describe("breadcrumbTrail", () => {
  it("gives no breadcrumb on the homepage", () => {
    expect(breadcrumbTrail("/")).toBeNull();
  });

  it("goes from Home to the page", () => {
    expect(breadcrumbTrail("/pricing")).toEqual([
      { href: "/", label: "Home" },
      { href: "/pricing", label: "Pricing" },
    ]);
  });

  it("includes each named level of a nested page", () => {
    expect(breadcrumbTrail("/contact/sent?ref=WNJO-ABC123")).toEqual([
      { href: "/", label: "Home" },
      { href: "/contact", label: "Contact" },
      { href: "/contact/sent", label: "Message received" },
    ]);
  });

  it("gives no breadcrumb on the dashboards or unknown pages", () => {
    expect(breadcrumbTrail("/account")).toBeNull();
    expect(breadcrumbTrail("/admin")).toBeNull();
    expect(breadcrumbTrail("/no-such-page")).toBeNull();
  });

  it("can name a page passed in, such as an article", () => {
    expect(breadcrumbTrail("/resources/first", { "/resources/first": "First article" })?.at(-1)).toEqual({
      href: "/resources/first",
      label: "First article",
    });
  });
});
