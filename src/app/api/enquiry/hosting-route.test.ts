import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { saveEnquiry } from "@/lib/enquiry-store";

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
      headers: { "content-type": "application/json", "x-forwarded-for": `10.2.0.${++ip}` },
      body: JSON.stringify(body),
    }),
  );

const details = { name: "Sam Rivers", businessName: "Rivers Cafe", email: "sam@riverscafe.co.uk", phone: "07700 900123", existingWebsite: "riverscafe.co.uk" };
const hosting = (over: Record<string, unknown> = {}) => ({ kind: "hosting", plan: "care", status: "have", details, startedAt: Date.now() - 10_000, ...over });

describe("POST /api/enquiry (hosting only)", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubEnv("RESEND_API_KEY", "test-key");
    vi.stubEnv("ENQUIRY_TO_EMAIL", "inbox@example.com");
    vi.stubEnv("ENQUIRY_FROM_EMAIL", "site@example.com");
    vi.stubEnv("STORE_ON", "1");
    vi.mocked(saveEnquiry).mockClear();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("saves the request, emails the owner and acknowledges the customer, charging nothing", async () => {
    const res = await post(hosting());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toMatchObject({ ok: true, pay: null, paymentStarted: false });
    expect(json.reference).toMatch(/^WNJO-[0-9A-F]{6}$/);
    const saved = vi.mocked(saveEnquiry).mock.calls[0][0];
    expect(saved).toMatchObject({ kind: "contact", topic: "Hosting request", email: "sam@riverscafe.co.uk" });
    expect(saved.body).toContain("Plan: Care, £95 a month");
    expect(saved.body).toContain("Website address: riverscafe.co.uk");
    expect(saved.body).toContain("secure payment link");
  });

  it("takes the price from the plan on the server, whatever the browser sends", async () => {
    const res = await post(hosting({ plan: "hosting", monthly: 1, price: 1, details: { ...details } }));
    expect(res.status).toBe(200);
    expect(vi.mocked(saveEnquiry).mock.calls[0][0].body).toContain("Plan: Hosting, £49 a month");
  });

  it("notes that someone who needs a website was shown the ways we can build one", async () => {
    const res = await post(hosting({ status: "need", details: { ...details, existingWebsite: "" } }));
    expect(res.status).toBe(200);
    const body = vi.mocked(saveEnquiry).mock.calls[0][0].body;
    expect(body).toContain("I need a website");
    expect(body).toContain("from £999");
  });

  it("refuses a made-up plan or a missing website address, and saves nothing", async () => {
    expect((await post(hosting({ plan: "platinum" }))).status).toBe(422);
    const noAddress = await post(hosting({ details: { ...details, existingWebsite: "" } }));
    expect(noAddress.status).toBe(422);
    expect((await noAddress.json()).fields.existingWebsite).toBeDefined();
    expect(saveEnquiry).not.toHaveBeenCalled();
  });

  it("quietly ignores a robot that fills the hidden field", async () => {
    const res = await post(hosting({ website: "http://spam.example" }));
    expect(res.status).toBe(200);
    expect(saveEnquiry).not.toHaveBeenCalled();
  });
});
