import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_WEBSITE_ANSWERS } from "@/lib/website-quote";

const state = vi.hoisted(() => ({
  route: "package" as "package" | "proposal",
  payment: null as null | { url: string | null; offer: { id: string; reference: string; token: string; amounts: Record<string, unknown> } },
  saved: 0,
}));

vi.mock("@/lib/enquiry-store", () => ({
  WNJO_TENANT_ID: "00000000-0000-4000-8000-000000000001",
  enquiryStoreConfigured: () => true,
  saveEnquiry: vi.fn(async () => {
    state.saved++;
    return true;
  }),
}));
vi.mock("@/lib/instant-quote", () => ({ issueInstantQuote: vi.fn(async () => null) }));
vi.mock("@/lib/quote-store", () => ({ serviceClient: () => ({}) }));
vi.mock("@/lib/rate-limit-shared", () => ({ LIMITS_PER_ROUTE: { enquiry: { max: 5, windowSeconds: 600 } }, sharedRateLimited: async () => false }));
vi.mock("@/lib/brief-store", () => ({
  confirmBriefFiles: vi.fn(async (_db: unknown, _id: string, brief: unknown) => brief),
  createBrief: vi.fn(async () => ({ id: "b1", route: state.route })),
}));
vi.mock("@/lib/pay-from-quote", () => ({ startQuotePayment: vi.fn(async () => state.payment) }));
const { POST } = await import("./route");
const { startQuotePayment } = await import("@/lib/pay-from-quote");

const DRAFT = "3f1c2a4e-9b7d-4c2a-8e1f-0a1b2c3d4e5f";
let ip = 0;
const post = (body: unknown) =>
  POST(new NextRequest("http://localhost/api/enquiry", { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": `10.3.0.${++ip}` }, body: JSON.stringify(body) }));
const body = (over: Record<string, unknown> = {}) => ({
  kind: "website",
  intent: "pay",
  agree: true,
  answers: { ...DEFAULT_WEBSITE_ANSWERS, plan: "silver", mode: "monthly", pages: "4-5" },
  details: { name: "Ada Lovelace", businessName: "Analytical Engines Ltd", email: "ada@example.com", phone: "", industry: "Engineering", existingWebsite: "", description: "We build calculating machines for local businesses.", customers: "", launchDate: "", requirements: "" },
  brief: { goals: ["bookings"], goalNote: "", pages: ["Home"], style: null, references: [], colours: "", avoid: "", functionality: "", files: [] },
  draftId: DRAFT,
  startedAt: Date.now() - 10_000,
  ...over,
});
const offer = { id: "off-1", reference: "WS-ABC123", token: "t".repeat(43), amounts: { kind: "subscription", packageName: "Plus", setupPence: 14900, monthlyPence: 14900, oneOffPence: 0 } };

describe("POST /api/enquiry: pay straight from the quote", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubEnv("RESEND_API_KEY", "test-key");
    vi.stubEnv("ENQUIRY_TO_EMAIL", "inbox@example.com");
    vi.stubEnv("ENQUIRY_FROM_EMAIL", "site@example.com");
    vi.mocked(startQuotePayment).mockClear();
    state.route = "package";
    state.payment = { url: "https://checkout.stripe.com/c/pay/cs_test_1", offer };
    state.saved = 0;
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });
  const emails = () => fetchMock.mock.calls.map((c) => JSON.parse(c[1].body) as { to: string[]; subject: string; text: string });

  it("saves the brief, starts the payment from the server's own figures, and returns the Stripe page", async () => {
    const res = await post(body({ figures: { monthly: 1 } }));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, route: "package", tracked: true, pay: { url: "https://checkout.stripe.com/c/pay/cs_test_1" }, paymentStarted: true });
    const args = vi.mocked(startQuotePayment).mock.calls[0][1];
    expect(args).toMatchObject({ route: "package", email: "ada@example.com", tenantId: "00000000-0000-4000-8000-000000000001", origin: "http://localhost" });
    expect(args.quote.mode).toBe("monthly");
    expect(args.quote.monthly).toBe(149);
    expect(args.reference).toMatch(/^WNJO-[0-9A-F]{6}$/);
  });

  it("emails the owner that an order is coming, and the customer their private payment link", async () => {
    await post(body());
    const [owner, customer] = emails();
    expect(owner.subject).toContain("Website order (paying now)");
    expect(customer.to).toEqual(["ada@example.com"]);
    expect(customer.subject).toBe("Your website is waiting [WS-ABC123]");
    expect(customer.text).toContain(`http://localhost/subscribe/${"t".repeat(43)}`);
    expect(customer.text).not.toContain("written proposal");
  });

  it("refuses to take an order unless the customer agreed to the terms, and saves nothing", async () => {
    for (const agree of [false, undefined, "true", 1]) {
      const res = await post(body({ agree }));
      expect(res.status).toBe(422);
    }
    expect(state.saved).toBe(0);
    expect(startQuotePayment).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("short plan checkout: pays with just name, business and email, and no brief", async () => {
    const short = { short: true, brief: undefined, draftId: null, details: { ...body().details, industry: "", description: "" } };
    const res = await post(body(short));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, tracked: true, pay: { url: "https://checkout.stripe.com/c/pay/cs_test_1" } });
    expect(vi.mocked(startQuotePayment).mock.calls[0][1].quote.monthly).toBe(149);
  });

  it("short plan checkout: an email address alone is enough, and the customer is stored as New customer", async () => {
    const res = await post(body({ short: true, brief: undefined, draftId: null, details: { ...body().details, name: "", businessName: "", industry: "", description: "" } }));
    expect(res.status).toBe(200);
    const args = vi.mocked(startQuotePayment).mock.calls[0][1];
    expect(args).toMatchObject({ email: "ada@example.com", name: "New customer" });
    const [, customer] = emails();
    expect(customer.text).toContain("Hi there,");
  });

  it("short plan checkout: refuses a project (one-off) and anything that isn't a payment", async () => {
    const short = { short: true, brief: undefined, details: { ...body().details, industry: "", description: "" } };
    const oneOff = await post(body({ ...short, answers: { ...DEFAULT_WEBSITE_ANSWERS, mode: "oneOff", want: "oneOff" } }));
    expect(oneOff.status).toBe(422);
    const quoteOnly = await post(body({ ...short, intent: "quote" }));
    expect(quoteOnly.status).toBe(422);
    expect(startQuotePayment).not.toHaveBeenCalled();
  });

  it("never takes payment for a bespoke build: it stays a proposal and the customer gets the usual acknowledgement", async () => {
    state.route = "proposal";
    state.payment = null;
    const res = await post(body({ answers: { ...DEFAULT_WEBSITE_ANSWERS, mode: "oneOff", want: "oneOff", pages: "6-10" } }));
    expect(await res.json()).toMatchObject({ ok: true, route: "proposal", pay: null, paymentStarted: false });
    const customer = emails()[1];
    expect(customer.subject).toContain("website estimate");
    expect(customer.text).toContain("written proposal");
  });

  it("keeps the brief and still emails the payment link when only Stripe fails", async () => {
    state.payment = { url: null, offer };
    const res = await post(body());
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, pay: null, paymentStarted: true });
    expect(emails()[1].subject).toBe("Your website is waiting [WS-ABC123]");
  });

  it("does nothing about payment for the other next steps", async () => {
    for (const intent of ["quote", "callback"]) {
      const res = await post(body({ intent, agree: undefined, details: { ...body().details, phone: "07700 900123" } }));
      expect(res.status).toBe(200);
    }
    expect(startQuotePayment).not.toHaveBeenCalled();
  });

  it("buy-outright request: saves a proposal-route brief, takes no payment, and sends the usual acknowledgement", async () => {
    const res = await post({
      kind: "project",
      details: { ...body().details, industry: "", description: "" },
      goals: ["bookings"],
      budget: "2k-5k",
      timeline: "1-3m",
      notes: "",
      startedAt: Date.now() - 10_000,
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, tracked: true, pay: null, paymentStarted: false });
    expect(startQuotePayment).not.toHaveBeenCalled();
    expect(emails().some((e) => e.to.includes("ada@example.com"))).toBe(true);
  });

  it("buy-outright request: refuses one with no budget or goals", async () => {
    const res = await post({ kind: "project", details: body().details, goals: [], startedAt: Date.now() - 10_000 });
    expect(res.status).toBe(422);
  });
});
