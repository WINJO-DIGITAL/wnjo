import { afterEach, describe, expect, it, vi } from "vitest";
import { enquiryTo, mailConfig, parseEnquiryRecipients, sendEmail, sendEnquiryEmail } from "./mailer";

const from = "WINJO DIGITAL <enquiries@winjodigital.co.uk>";

function resendTo(fetchMock: { mock: { calls: unknown[][] } }): unknown {
  const init = fetchMock.mock.calls[0]?.[1] as { body: string } | undefined;
  if (!init) throw new Error("Resend was not called");
  return JSON.parse(init.body).to;
}

describe("parseEnquiryRecipients", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("keeps a single address", () => {
    expect(parseEnquiryRecipients("hello@winjodigital.co.uk")).toEqual(["hello@winjodigital.co.uk"]);
    vi.stubEnv("ENQUIRY_TO_EMAIL", "hello@winjodigital.co.uk");
    vi.stubEnv("RESEND_API_KEY", "key");
    vi.stubEnv("ENQUIRY_FROM_EMAIL", from);
    expect(enquiryTo()).toBe("hello@winjodigital.co.uk");
    expect(mailConfig()).toEqual({ apiKey: "key", to: "hello@winjodigital.co.uk", from });
  });

  it("keeps two addresses", () => {
    expect(parseEnquiryRecipients("hello@winjodigital.co.uk,winjodigital@gmail.com")).toEqual([
      "hello@winjodigital.co.uk",
      "winjodigital@gmail.com",
    ]);
    vi.stubEnv("ENQUIRY_TO_EMAIL", "hello@winjodigital.co.uk,winjodigital@gmail.com");
    expect(enquiryTo()).toEqual(["hello@winjodigital.co.uk", "winjodigital@gmail.com"]);
  });

  it("trims whitespace, drops empties, and drops anything that is not an email", () => {
    expect(parseEnquiryRecipients("  hello@winjodigital.co.uk , , not-an-email, winjodigital@gmail.com  ")).toEqual([
      "hello@winjodigital.co.uk",
      "winjodigital@gmail.com",
    ]);
  });
});

describe("sendEmail", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("does not call Resend for a reserved address in production", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const ok = await sendEmail(
      { apiKey: "key", from: "WINJO DIGITAL <enquiries@winjodigital.co.uk>" },
      { to: "customer@sample-cars.test", subject: "Booking confirmed", text: "Hello" },
      "Booking request",
    );
    expect(ok).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("still sends a reserved address outside production", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    const fetchMock = vi.fn(async () => new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const ok = await sendEmail(
      { apiKey: "key", from: "WINJO DIGITAL <enquiries@winjodigital.co.uk>" },
      { to: "book@hartley.example", subject: "Hello", text: "Hello" },
    );
    expect(ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("sends one address in a single Resend call", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    const fetchMock = vi.fn(async () => new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("RESEND_API_KEY", "key");
    vi.stubEnv("ENQUIRY_FROM_EMAIL", from);
    vi.stubEnv("ENQUIRY_TO_EMAIL", "hello@winjodigital.co.uk");
    const config = mailConfig();
    if (!config) throw new Error("mail config missing");
    expect(config.to).toBe("hello@winjodigital.co.uk");
    const ok = await sendEnquiryEmail(config, { subject: "Enquiry", text: "Hello", replyTo: "ada@shop.co.uk" });
    expect(ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(resendTo(fetchMock)).toEqual(["hello@winjodigital.co.uk"]);
  });

  it("sends two addresses in one Resend call", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    const fetchMock = vi.fn(async () => new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const ok = await sendEmail(
      { apiKey: "key", from },
      { to: ["hello@winjodigital.co.uk", "winjodigital@gmail.com"], subject: "Enquiry", text: "Hello", internal: true },
      "Enquiry",
    );
    expect(ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(resendTo(fetchMock)).toEqual(["hello@winjodigital.co.uk", "winjodigital@gmail.com"]);
  });

  it("trims a list with whitespace before the one Resend call", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("RESEND_API_KEY", "key");
    vi.stubEnv("ENQUIRY_FROM_EMAIL", from);
    vi.stubEnv("ENQUIRY_TO_EMAIL", "  hello@winjodigital.co.uk , , winjodigital@gmail.com  ");
    const fetchMock = vi.fn(async () => new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const config = mailConfig();
    if (!config) throw new Error("mail config missing");
    const ok = await sendEnquiryEmail(config, { subject: "Enquiry", text: "Hello", replyTo: "ada@shop.co.uk" });
    expect(ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(resendTo(fetchMock)).toEqual(["hello@winjodigital.co.uk", "winjodigital@gmail.com"]);
  });

  it("skips a reserved address in the list and sends the rest", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    const fetchMock = vi.fn(async () => new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const ok = await sendEmail(
      { apiKey: "key", from },
      { to: ["book@hartley.example", "hello@winjodigital.co.uk"], subject: "Enquiry", text: "Hello", internal: true },
      "Enquiry",
    );
    expect(ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(resendTo(fetchMock)).toEqual(["hello@winjodigital.co.uk"]);
  });
});
