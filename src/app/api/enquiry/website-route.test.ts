import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { saveEnquiry } from "@/lib/enquiry-store";
import { DEFAULT_WEBSITE_ANSWERS } from "@/lib/website-quote";

vi.mock("@/lib/enquiry-store", () => ({
  enquiryStoreConfigured: () => process.env.STORE_ON === "1",
  saveEnquiry: vi.fn(async () => true),
}));
vi.mock("@/lib/instant-quote", () => ({ issueInstantQuote: vi.fn(async () => null) }));

let ip = 0;
const post = (body: unknown) =>
  POST(
    new NextRequest("http://localhost/api/enquiry", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": `10.1.0.${++ip}` },
      body: JSON.stringify(body),
    }),
  );

const details = {
  name: "Ada Lovelace",
  businessName: "Analytical Engines Ltd",
  email: "ada@example.com",
  phone: "07700 900123",
  industry: "Engineering",
  existingWebsite: "",
  description: "We build calculating machines for local businesses.",
  customers: "",
  launchDate: "",
  requirements: "",
};
const quote = (over: Record<string, unknown> = {}) => ({
  kind: "website",
  intent: "quote",
  answers: { ...DEFAULT_WEBSITE_ANSWERS, plan: "silver", mode: "monthly", pages: "6-10" },
  details,
  startedAt: Date.now() - 10_000,
  ...over,
});

describe("POST /api/enquiry (website quote)", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubEnv("RESEND_API_KEY", "test-key");
    vi.stubEnv("ENQUIRY_TO_EMAIL", "inbox@example.com");
    vi.stubEnv("ENQUIRY_FROM_EMAIL", "site@example.com");
    vi.mocked(saveEnquiry).mockClear();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("recalculates the price on the server and emails the owner and the customer", async () => {
    const res = await post(quote({ answers: { ...quote().answers }, figures: { monthly: 1 } }));
    expect(res.status).toBe(200);
    const { reference } = await res.json();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const owner = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(owner.to).toEqual(["inbox@example.com"]);
    expect(owner.reply_to).toBe("ada@example.com");
    expect(owner.subject).toContain("Plus £199/month");
    expect(owner.text).toContain("Initial payment: £348");
    const customer = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(customer.to).toEqual(["ada@example.com"]);
    expect(customer.subject).toContain(reference);
    expect(customer.text).toContain("Initial payment: £348");
    expect(customer.text).toContain("Then: £199 a month");
    expect(customer.text).toContain("Final pricing is confirmed in a written proposal");
  });

  it("stores the answers and the recalculated figures", async () => {
    vi.stubEnv("STORE_ON", "1");
    await post(quote());
    const row = vi.mocked(saveEnquiry).mock.calls[0][0];
    expect(row.kind).toBe("brief");
    expect(row.topic).toBe("Website quote");
    expect(row.company).toBe("Analytical Engines Ltd");
    expect((row.answers as { figures: { monthly: number; setup: number } }).figures).toMatchObject({ monthly: 199, setup: 149 });
  });

  it("needs a phone number for a callback", async () => {
    const res = await post(quote({ intent: "callback", details: { ...details, phone: "" } }));
    expect(res.status).toBe(422);
    expect((await res.json()).fields.phone).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses a consultation booking while no calendar is connected, rather than pretending", async () => {
    const res = await post(quote({ intent: "consultation" }));
    expect(res.status).toBe(422);
    expect((await res.json()).code).toBe("calendar_unavailable");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects missing details and tampered answers", async () => {
    expect((await post(quote({ details: { ...details, email: "nope" } }))).status).toBe(422);
    expect((await post(quote({ answers: { ...DEFAULT_WEBSITE_ANSWERS, plan: "platinum" } }))).status).toBe(422);
    expect((await post(quote({ answers: { ...DEFAULT_WEBSITE_ANSWERS, want: "software" } }))).status).toBe(422);
  });

  it("drops automated submissions silently", async () => {
    expect((await post(quote({ website: "http://spam" }))).status).toBe(200);
    expect((await post(quote({ startedAt: Date.now() }))).status).toBe(200);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
