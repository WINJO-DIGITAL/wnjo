import { describe, expect, it } from "vitest";
import { REMINDER_AFTER_DAYS, reminderCutoff, reminderEmail } from "@/lib/quote-reminder";

describe("reminderCutoff", () => {
  it("is the reminder age before now", () => {
    expect(reminderCutoff(new Date("2026-11-10T12:00:00Z"))).toBe("2026-11-07T12:00:00.000Z");
    expect(REMINDER_AFTER_DAYS).toBe(3);
  });
});

describe("reminderEmail", () => {
  const email = reminderEmail({ name: "Sam Jones", quoteReference: "Q-0000AB12", siteUrl: "https://www.wnjoweb.co.uk/" });

  it("restates the quote and how to accept it, with one greeting", () => {
    expect(email.subject).toBe("Your WNJO quote Q-0000AB12 is still open");
    expect(email.text.startsWith("Hi Sam,")).toBe(true);
    expect(email.text).toContain("sign in at https://www.wnjoweb.co.uk/account");
  });

  it("is not pushy: no deadlines or urgency words", () => {
    expect(email.text).not.toMatch(/urgent|last chance|expires|hurry|act now/i);
  });
});
