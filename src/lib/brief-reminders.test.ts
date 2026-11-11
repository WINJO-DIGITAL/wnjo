import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { REMINDER_AFTER_MS, detailsReminderEmail, needsDetailsReminder, sendBriefDetailsReminders } from "./brief-reminders";
import { projectAcknowledgement } from "./website-emails";

const now = Date.parse("2026-11-12T09:00:00Z");
const c = (over: Partial<{ created_at: string; brief: { goals?: unknown[] } | null }> = {}) => ({
  id: "b1",
  reference: "WNJO-ABC123",
  email: "ada@example.com",
  name: "Ada Lovelace",
  created_at: new Date(now - REMINDER_AFTER_MS - 60_000).toISOString(),
  brief: { goals: [] },
  ...over,
});

describe("brief details reminder", () => {
  it("reminds a paid website with no goals, once it is a day old", () => {
    expect(needsDetailsReminder(c(), false, now)).toBe(true);
  });
  it("waits until a day has passed", () => {
    expect(needsDetailsReminder(c({ created_at: new Date(now - 60 * 60 * 1000).toISOString() }), false, now)).toBe(false);
  });
  it("does not remind once goals are in", () => {
    expect(needsDetailsReminder(c({ brief: { goals: ["bookings"] } }), false, now)).toBe(false);
  });
  it("does not remind twice", () => {
    expect(needsDetailsReminder(c(), true, now)).toBe(false);
  });
  it("points the customer to their account, with their first name", () => {
    const m = detailsReminderEmail({ name: "Ada Lovelace", reference: "WNJO-ABC123", siteUrl: "https://example.test/" });
    expect(m.text).toContain("Hi Ada,");
    expect(m.text).toContain("https://example.test/account");
    expect(m.subject).toContain("WNJO-ABC123");
  });
});

describe("buy-outright acknowledgement", () => {
  const details = { name: "Ada Lovelace", businessName: "Analytical Engines Ltd", email: "ada@example.com", phone: "", industry: "", existingWebsite: "", description: "", customers: "", launchDate: "", requirements: "" };
  it("gives no estimate or 'from' price, and says nothing is charged until a proposal is accepted", () => {
    const m = projectAcknowledgement({ reference: "WNJO-ABC123", details, siteUrl: "https://example.test" });
    expect(m.text).not.toMatch(/estimate/i);
    expect(m.text).not.toContain("£999");
    expect(m.text).toContain("Nothing is charged until you have read and accepted that proposal.");
    expect(m.text).toContain("50% deposit");
  });
});

describe("who the reminder looks at", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("only picks briefs that have been paid for, never the stages before payment", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("ENQUIRY_FROM_EMAIL", "hello@example.test");
    const seen: { column: string; values: string[] }[] = [];
    // A chainable stand-in for the query builder that records the stages asked for and returns no rows.
    const chain: unknown = new Proxy(
      {},
      {
        get: (_target, prop) => {
          if (prop === "then") return (resolve: (v: { data: unknown[] }) => void) => resolve({ data: [] });
          if (prop === "in") return (column: string, values: string[]) => (seen.push({ column, values }), chain);
          return () => chain;
        },
      },
    );
    await sendBriefDetailsReminders({ from: () => chain } as unknown as SupabaseClient, now);
    // "Thank you for paying" must never reach someone still at brief_received, reviewing or awaiting_payment.
    expect(seen).toEqual([{ column: "stage", values: ["specification"] }]);
  });
});
