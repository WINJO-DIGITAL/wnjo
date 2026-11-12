import { describe, expect, it } from "vitest";
import { parseSiteEnquiry, siteEnquiryEmail } from "./enquiry";

const good = { name: "Sam Lee", contact: "07700 900123", message: "Saturday morning for a skin fade?" };

describe("parseSiteEnquiry", () => {
  it("accepts a name, a phone or email, and a message", () => {
    expect(parseSiteEnquiry(good)).toEqual({ ok: true, enquiry: good });
    expect(parseSiteEnquiry({ ...good, contact: "sam@example.com" }).ok).toBe(true);
  });

  it("lets the message be empty", () => {
    expect(parseSiteEnquiry({ ...good, message: "" })).toMatchObject({ ok: true, enquiry: { message: "" } });
  });

  it("asks for what is missing or unusable", () => {
    expect(parseSiteEnquiry({ ...good, name: "  " })).toMatchObject({ ok: false, reason: "Add your name." });
    expect(parseSiteEnquiry({ ...good, contact: "call me" })).toMatchObject({ ok: false });
    expect(parseSiteEnquiry({})).toMatchObject({ ok: false });
  });

  it("treats anything in the hidden field as a bot", () => {
    expect(parseSiteEnquiry({ ...good, website: "http://spam.example" })).toMatchObject({ ok: false, spam: true });
    expect(parseSiteEnquiry({ ...good, website: "" }).ok).toBe(true);
  });

  it("strips tags and control characters and trims to the limits", () => {
    const r = parseSiteEnquiry({ name: "<b>Sam</b>\u0000", contact: "sam@example.com", message: "x".repeat(2000) });
    expect(r.ok && r.enquiry.name).toBe("Sam");
    expect(r.ok && r.enquiry.message).toHaveLength(1000);
  });

  it("ignores non-text input", () => {
    expect(parseSiteEnquiry({ name: 5, contact: {}, message: [] }).ok).toBe(false);
  });
});

describe("siteEnquiryEmail", () => {
  it("is plain text naming the business, with a reply-to only when they gave an email", () => {
    const withPhone = siteEnquiryEmail({ businessName: "Hartley & Sons", enquiry: good });
    expect(withPhone.subject).toBe("New booking request for Hartley & Sons");
    expect(withPhone.text).toContain("Phone or email: 07700 900123");
    expect(withPhone.text).toContain("Saturday morning");
    expect(withPhone.replyTo).toBeUndefined();
    expect(siteEnquiryEmail({ businessName: "H", enquiry: { ...good, contact: "sam@example.com" } }).replyTo).toBe("sam@example.com");
  });

  it("keeps the subject to one line whatever the business is called", () => {
    expect(siteEnquiryEmail({ businessName: "Evil\r\nBcc: x@y.z", enquiry: good }).subject).not.toMatch(/[\r\n]/);
  });

  it("says when there was no message", () => {
    expect(siteEnquiryEmail({ businessName: "H", enquiry: { ...good, message: "" } }).text).toContain("didn't add a message");
  });
});
