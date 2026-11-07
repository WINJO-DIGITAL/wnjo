import { describe, expect, it } from "vitest";
import { buildNotificationEmail, sendOutbox, type OutboxRow } from "@/lib/notify/outbox";

const row = (id: string, recipient = "u1", attempts = 0): OutboxRow => ({ id, recipient_user_id: recipient, title: "New message from WNJO", body: "Your homepage is ready to review.", link: "/account", email_attempts: attempts });

describe("buildNotificationEmail", () => {
  it("links to the account page on the site", () => {
    const email = buildNotificationEmail(row("n1"), "https://www.wnjoweb.co.uk/");
    expect(email.subject).toBe("New message from WNJO");
    expect(email.text).toContain("Open your account: https://www.wnjoweb.co.uk/account");
    expect(email.text.startsWith("Your homepage is ready to review.")).toBe(true);
  });

  it("falls back to the account page when a notice has no link", () => {
    const email = buildNotificationEmail({ title: "t", body: "b", link: null }, "https://www.wnjoweb.co.uk");
    expect(email.text).toContain("https://www.wnjoweb.co.uk/account");
  });

  it("sends plain text only, with no HTML", () => {
    const email = buildNotificationEmail({ title: "t", body: "<b>bold</b>", link: "/account" }, "https://x.test");
    expect(email.text).toContain("<b>bold</b>");
    expect(email.text).not.toMatch(/<a |<html/i);
  });
});

describe("sendOutbox", () => {
  function ports(rows: OutboxRow[], opts: { emails?: Record<string, string | null>; fail?: string[] } = {}) {
    const sent: Array<{ to: string; subject: string }> = [];
    const marked: string[] = [];
    const failedRows: string[] = [];
    return {
      sent,
      marked,
      failedRows,
      ports: {
        loadUnsent: async () => rows,
        markFailed: async (r: OutboxRow) => {
          failedRows.push(r.id);
        },
        emailFor: async (userId: string) => (opts.emails ?? { u1: "a@example.test", u2: "b@example.test" })[userId] ?? null,
        send: async (to: string, email: { subject: string; text: string }) => {
          if (opts.fail?.includes(to)) return false;
          sent.push({ to, subject: email.subject });
          return true;
        },
        markSent: async (id: string) => {
          marked.push(id);
        },
      },
    };
  }

  it("sends each email once and marks it sent", async () => {
    const f = ports([row("n1"), row("n2", "u2")]);
    const result = await sendOutbox(f.ports, { siteUrl: "https://www.wnjoweb.co.uk" });
    expect(result).toEqual({ sent: 2, failed: 0, skipped: 0 });
    expect(f.sent.map((s) => s.to)).toEqual(["a@example.test", "b@example.test"]);
    expect(f.marked).toEqual(["n1", "n2"]);
  });

  it("leaves a failed email unmarked and counts the attempt, so the next run tries it again", async () => {
    const f = ports([row("n1")], { fail: ["a@example.test"] });
    const result = await sendOutbox(f.ports, { siteUrl: "https://www.wnjoweb.co.uk" });
    expect(result).toEqual({ sent: 0, failed: 1, skipped: 0 });
    expect(f.marked).toEqual([]);
    expect(f.failedRows).toEqual(["n1"]);
  });


  it("skips a recipient with no email address rather than failing the batch", async () => {
    const f = ports([row("n1", "ghost"), row("n2")]);
    const result = await sendOutbox(f.ports, { siteUrl: "https://www.wnjoweb.co.uk" });
    expect(result).toEqual({ sent: 1, failed: 0, skipped: 1 });
    expect(f.marked).toEqual(["n2"]);
    expect(f.failedRows).toEqual(["n1"]);
  });
});
