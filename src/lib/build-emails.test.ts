import { describe, expect, it } from "vitest";
import { handedOverEmail } from "./build-emails";

describe("handed-over email", () => {
  const email = handedOverEmail({ name: "Sam Hartley", reference: "WNJO-1", accountUrl: "https://winjodigital.co.uk/account", message: "Your domain is with IONOS." });

  it("tells the customer where to download their website pack", () => {
    expect(email.text).toContain("website pack");
    expect(email.text).toContain("https://winjodigital.co.uk/account");
  });

  it("carries the reference and staff's own note", () => {
    expect(email.subject).toContain("WNJO-1");
    expect(email.text).toContain("Your domain is with IONOS.");
  });

  it("leaves the note out when staff add none", () => {
    expect(handedOverEmail({ name: "Sam", reference: "WNJO-2", accountUrl: "https://x.test/account" }).text).not.toContain("undefined");
  });
});
