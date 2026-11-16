import { describe, expect, it } from "vitest";
import { ENQUIRY_REPLY_TO, contactAcknowledgement } from "./enquiry-ack";

describe("contact acknowledgement", () => {
  const message = contactAcknowledgement({ name: "Ada Lovelace", reference: "WNJO-ABC123" });

  it("quotes the reference and does not promise a reply time", () => {
    expect(message.subject).toContain("WNJO-ABC123");
    expect(message.text).toContain("Hi Ada,");
    expect(message.text).toContain("Your reference is WNJO-ABC123.");
    expect(message.text).toContain("WHAT HAPPENS NEXT");
    expect(message.text).toContain("reply by email");
    expect(message.text.toLowerCase()).not.toContain("working day");
    expect(message.text.toLowerCase()).not.toContain("within");
  });

  it("replies to the published business address", () => {
    expect(ENQUIRY_REPLY_TO).toBe("hello@winjodigital.co.uk");
  });
});
