import { afterEach, describe, expect, it, vi } from "vitest";
import { sendEmail } from "./mailer";

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
});
