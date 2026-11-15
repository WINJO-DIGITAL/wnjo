import { beforeEach, describe, expect, it, vi } from "vitest";

const state: {
  row: unknown; limited: boolean; mail: { apiKey: string; from: string } | null; sendOk: boolean; sent: { to: string; subject: string; text: string; replyTo?: string }[];
  saved: Record<string, unknown>[]; saveError: { message: string } | null; updates: unknown[];
} = {
  row: null, limited: false, mail: { apiKey: "k", from: "f@winjo.test" }, sendOk: true, sent: [], saved: [], saveError: null, updates: [],
};

vi.mock("@/lib/quote-store", () => ({
  serviceClient: () => ({
    from(table: string) {
      if (table === "site_enquiries")
        return {
          insert: (row: Record<string, unknown>) => ({ select: () => ({ maybeSingle: async () => (state.saved.push(row), { data: state.saveError ? null : { id: "lead1" }, error: state.saveError }) }) }),
          update: (values: unknown) => ({ eq: async () => (state.updates.push(values), { error: null }) }),
        };
      const b: Record<string, unknown> = {};
      for (const m of ["select", "eq"]) b[m] = () => b;
      b.maybeSingle = async () => ({ data: state.row, error: null });
      return b;
    },
  }),
}));
vi.mock("@/lib/rate-limit-shared", () => ({ sharedRateLimited: async () => state.limited }));
vi.mock("@/lib/mailer", () => ({ notificationMailConfig: () => state.mail, sendEmail: async (_c: unknown, m: never) => (state.sent.push(m), state.sendOk) }));

import { POST } from "./route";

const TOKEN = "abcdefghijklmnopqrstuvwxyz012345";
const post = (fields: Record<string, string>) => {
  const body = new FormData();
  for (const [k, v] of Object.entries(fields)) body.set(k, v);
  return POST(new Request("https://winjo.test/api/site-enquiry", { method: "POST", body }) as never);
};
const good = { token: TOKEN, name: "Sam", contact: "07700 900123", message: "Saturday?" };
const released = { status: "released", content: { business: { name: "Hartley & Sons" } }, website_briefs: { email: "owner@shop.co.uk", business_name: "Hartley & Sons", name: "Pat" } };

beforeEach(() => {
  state.row = released;
  state.limited = false;
  state.mail = { apiKey: "k", from: "f@winjo.test" };
  state.sendOk = true;
  state.sent = [];
  state.saved = [];
  state.saveError = null;
  state.updates = [];
});

describe("the booking-request route", () => {
  it("emails the website owner's account address and redirects back with a confirmation", async () => {
    const res = await post(good);
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe(`https://winjo.test/site-preview/${TOKEN}?sent=1#book`);
    expect(state.sent).toHaveLength(1);
    expect(state.sent[0].to).toBe("owner@shop.co.uk");
    expect(state.sent[0].subject).toBe("New booking request for Hartley & Sons");
  });

  it("saves the request before emailing it, and marks it sent once the email goes", async () => {
    await post({ ...good, page: "contact" });
    expect(state.saved).toEqual([expect.objectContaining({ name: "Sam", contact: "07700 900123", message: "Saturday?", page: "contact", tenant_id: undefined, build_id: undefined })]);
    expect(state.updates).toEqual([{ email_sent: true }]);
  });

  it("keeps a request whose email fails, but does not tell the visitor it was sent", async () => {
    state.sendOk = false;
    const res = await post(good);
    expect(state.saved).toHaveLength(1);
    expect(state.updates).toEqual([]);
    expect(res.headers.get("location")).toContain("sent=0");
  });

  it("returns the visitor to the page the form was on, and ignores a page name that isn't one", async () => {
    expect((await post({ ...good, page: "contact" })).headers.get("location")).toBe(`https://winjo.test/site-preview/${TOKEN}?page=contact&sent=1#book`);
    expect((await post({ ...good, page: "../admin" })).headers.get("location")).toBe(`https://winjo.test/site-preview/${TOKEN}?sent=1#book`);
  });

  it("never takes the recipient from the request", async () => {
    await post({ ...good, to: "victim@example.com", email: "victim@example.com" });
    expect(state.sent.map((m) => m.to)).toEqual(["owner@shop.co.uk"]);
  });

  it("sends nothing for a draft or withdrawn build, or an unknown site", async () => {
    state.row = { ...released, status: "draft" };
    expect((await post(good)).status).toBe(404);
    state.row = { ...released, status: "withdrawn" };
    expect((await post(good)).status).toBe(404);
    state.row = null;
    expect((await post(good)).status).toBe(404);
    expect(state.sent).toEqual([]);
  });

  it("rejects a malformed token without touching the database", async () => {
    expect((await post({ ...good, token: "short" })).status).toBe(404);
  });

  it("tells a visitor to try again when the details are unusable, and sends nothing", async () => {
    const res = await post({ ...good, contact: "call me" });
    expect(res.headers.get("location")).toContain("sent=0");
    expect(state.sent).toEqual([]);
  });

  it("tells a bot it worked, and sends nothing", async () => {
    const res = await post({ ...good, website: "http://spam.example" });
    expect(res.headers.get("location")).toContain("sent=1");
    expect(state.sent).toEqual([]);
  });

  it("stops when rate limited, and reports a failed send honestly", async () => {
    state.limited = true;
    expect((await post(good)).headers.get("location")).toContain("sent=0");
    expect(state.sent).toEqual([]);
    state.limited = false;
    state.sendOk = false;
    expect((await post(good)).headers.get("location")).toContain("sent=0");
    state.mail = null;
    expect((await post(good)).headers.get("location")).toContain("sent=0");
  });
});
