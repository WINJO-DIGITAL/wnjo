import { describe, expect, it } from "vitest";
import { parseNewClient } from "@/lib/client-invite";

describe("parseNewClient", () => {
  it("trims the name and lower-cases the email", () => {
    expect(parseNewClient({ name: "  Café Nero Test ", email: " Owner@Example.TEST " })).toEqual({
      ok: true,
      name: "Café Nero Test",
      email: "owner@example.test",
    });
  });

  it("refuses a missing name and a bad email", () => {
    expect(parseNewClient({ name: "", email: "a@b.co" }).ok).toBe(false);
    expect(parseNewClient({ name: "X", email: "not-an-email" }).ok).toBe(false);
    expect(parseNewClient({ name: "X", email: "a b@c.co" }).ok).toBe(false);
    expect(parseNewClient(null).ok).toBe(false);
  });
});
