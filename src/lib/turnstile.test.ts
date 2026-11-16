import { afterEach, describe, expect, it, vi } from "vitest";
import { turnstileConfigured, verifyTurnstile } from "./turnstile";

describe("Turnstile", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("does nothing until both keys are set", async () => {
    expect(turnstileConfigured({})).toBe(false);
    expect(turnstileConfigured({ TURNSTILE_SECRET_KEY: "secret" })).toBe(false);
    await expect(verifyTurnstile("", "127.0.0.1", {})).resolves.toBe("skip");
  });

  it("rejects a missing token once it is switched on", async () => {
    const env = { TURNSTILE_SECRET_KEY: "secret", NEXT_PUBLIC_TURNSTILE_SITE_KEY: "site" };
    await expect(verifyTurnstile("  ", "127.0.0.1", env)).resolves.toBe("fail");
  });

  it("accepts only a successful check from Cloudflare", async () => {
    const env = { TURNSTILE_SECRET_KEY: "secret", NEXT_PUBLIC_TURNSTILE_SITE_KEY: "site" };
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ success: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(verifyTurnstile("token", "127.0.0.1", env)).resolves.toBe("ok");
    const called = (fetchMock.mock.calls as unknown[][])[0]?.[0];
    expect(String(called)).toContain("siteverify");
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ success: false }), { status: 200 }));
    await expect(verifyTurnstile("token", "127.0.0.1", env)).resolves.toBe("fail");
  });
});
