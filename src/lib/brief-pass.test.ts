import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { BRIEF_PASS_HOURS, briefPassKey, briefPassValid, issueBriefPass } = await import("./brief-pass");

const KEY = briefPassKey({ SUPABASE_SERVICE_ROLE_KEY: "secret-one" })!;
const OTHER_KEY = briefPassKey({ SUPABASE_SERVICE_ROLE_KEY: "secret-two" })!;
const A = "3f1c2a4e-9b7d-4c2a-8e1f-0a1b2c3d4e5f";
const B = "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d";
const NOW = 1_800_000_000_000;

describe("the brief pass", () => {
  it("needs a server secret to exist, and gives a different key for a different secret", () => {
    expect(briefPassKey({})).toBeNull();
    expect(KEY.equals(OTHER_KEY)).toBe(false);
  });

  it("is accepted for the brief it was made for", () => {
    const pass = issueBriefPass(A, KEY, NOW)!;
    expect(briefPassValid(pass, A, KEY, NOW + 1000)).toBe(true);
  });

  it("is refused for any other brief", () => {
    const pass = issueBriefPass(A, KEY, NOW)!;
    expect(briefPassValid(pass, B, KEY, NOW)).toBe(false);
  });

  it("expires after the set number of hours, and not before", () => {
    const pass = issueBriefPass(A, KEY, NOW)!;
    expect(briefPassValid(pass, A, KEY, NOW + (BRIEF_PASS_HOURS - 1) * 3_600_000)).toBe(true);
    expect(briefPassValid(pass, A, KEY, NOW + (BRIEF_PASS_HOURS + 1) * 3_600_000)).toBe(false);
  });

  it("is refused if any part is altered", () => {
    const [id, expires, sig] = issueBriefPass(A, KEY, NOW)!.split(".");
    expect(briefPassValid(`${id}.${Number(expires) + 86_400_000}.${sig}`, A, KEY, NOW)).toBe(false);
    expect(briefPassValid(`${id}.${expires}.${sig.slice(0, -2)}xx`, A, KEY, NOW)).toBe(false);
    expect(briefPassValid(`${B}.${expires}.${sig}`, B, KEY, NOW)).toBe(false);
  });

  it("is refused when signed with another key", () => {
    expect(briefPassValid(issueBriefPass(A, OTHER_KEY, NOW)!, A, KEY, NOW)).toBe(false);
  });

  it("is refused when it is missing, malformed or not a string", () => {
    for (const bad of [undefined, null, 42, "", "a.b", "a.b.c.d", `${A}.x.y`, "x".repeat(500)]) expect(briefPassValid(bad, A, KEY, NOW)).toBe(false);
  });

  it("will not issue a pass for something that isn't a brief id", () => {
    expect(issueBriefPass("not-a-uuid", KEY)).toBeNull();
  });
});
