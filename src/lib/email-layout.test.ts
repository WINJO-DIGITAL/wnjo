import { describe, expect, it } from "vitest";
import { buttonLabel, escapeHtml, parseBlocks, renderEmailHtml } from "./email-layout";

const site = "https://winjodigital.co.uk";
const html = (text: string) => renderEmailHtml({ subject: "Subject", text }, { siteUrl: site });

describe("the email layout", () => {
  it("escapes every piece of text, so visitor input can't add markup", () => {
    const out = html("Hi <img src=x onerror=alert(1)>,\n\nYour message: <script>bad()</script> & \"quotes\"");
    expect(out).not.toContain("<script>");
    expect(out).not.toContain("<img src=x");
    expect(out).toContain("&lt;script&gt;");
    expect(escapeHtml("a&b<c>\"'")).toBe("a&amp;b&lt;c&gt;&quot;&#39;");
  });

  it("turns a standalone web link into the main button, wherever it sits in the text", () => {
    const out = html("Hi Sam,\n\nYou can see your plan here:\nhttps://winjodigital.co.uk/account\n\nQuestions? Reply to this email.");
    expect(out).toContain(">Go to your account</a>");
    expect(out.match(/border-radius:999px;background/g)?.length).toBe(1);
  });

  it("labels the button by where the link goes", () => {
    expect(buttonLabel("https://winjodigital.co.uk/subscribe/abc")).toBe("Continue to payment");
    expect(buttonLabel("https://winjodigital.co.uk/account")).toBe("Go to your account");
    expect(buttonLabel("https://winjodigital.co.uk/website-projects")).toBe("View website projects");
    expect(buttonLabel("https://winjodigital.co.uk/subscribe/done")).toBe("Open link");
  });

  it("sets 'Label: value' lines out as a details panel", () => {
    const blocks = parseBlocks("Reference: WS-ABC123\nPlan: Care hosting\nMonthly payment: £95, taken each month");
    expect(blocks).toEqual([{ kind: "details", rows: [["Reference", "WS-ABC123"], ["Plan", "Care hosting"], ["Monthly payment", "£95, taken each month"]] }]);
  });

  it("reads a short line after a blank line as a heading, but not a greeting or a sentence", () => {
    const blocks = parseBlocks("Hi Sam,\n\nWHAT HAPPENS NEXT\nWe reply within one working day.\n\nYour agreement\nWe look after your website.");
    expect(blocks.map((b) => b.kind)).toEqual(["paragraph", "heading", "paragraph", "heading", "paragraph"]);
  });

  it("sets the sign-off in the footer, not as a last paragraph", () => {
    const out = html("Hi Sam,\n\nThanks.\n\nWINJO DIGITAL");
    expect(out.match(/WINJO DIGITAL/g)?.length).toBeGreaterThan(1);
    expect(out).toContain("Based in Thornton-Cleveleys, Lancashire");
  });

  it("is a complete HTML document with a hidden preview line", () => {
    const out = html("Hi Sam,\n\nYour hosting is active.");
    expect(out.startsWith("<!doctype html>")).toBe(true);
    expect(out).toContain("display:none");
    expect(out).toContain("Your hosting is active.");
  });
});
