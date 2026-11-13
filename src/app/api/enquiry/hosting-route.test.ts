import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { saveEnquiry } from "@/lib/enquiry-store";
import { createHostingOffer } from "@/lib/website-offers";
import { createOfferCheckout } from "@/lib/website-subscriptions";

vi.mock("@/lib/enquiry-store", () => ({
  enquiryStoreConfigured: () => process.env.STORE_ON === "1",
  saveEnquiry: vi.fn(async () => true),
  WNJO_TENANT_ID: "t1",
}));
vi.mock("@/lib/instant-quote", () => ({ issueInstantQuote: vi.fn(async () => null) }));
vi.mock("@/lib/quote-store", () => ({ serviceClient: () => ({}) }));
vi.mock("@/lib/rate-limit-shared", async (importActual) => ({ ...(await importActual<typeof import("@/lib/rate-limit-shared")>()), sharedRateLimited: async () => false }));
vi.mock("@/lib/stripe", async (importActual) => ({ ...(await importActual<typeof import("@/lib/stripe")>()), stripeConfig: () => ({ secretKey: "sk_test_123" }) }));
vi.mock("@/lib/website-offers", async (importActual) => ({ ...(await importActual<typeof import("@/lib/website-offers")>()), createHostingOffer: vi.fn() }));
vi.mock("@/lib/website-subscriptions", async (importActual) => ({ ...(await importActual<typeof import("@/lib/website-subscriptions")>()), createOfferCheckout: vi.fn() }));
const { POST } = await import("./route");

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
const hosting = (over: Record<string, unknown> = {}) => ({ kind: "hosting", plan: "care", status: "have", details, agree: true, startedAt: Date.now() - 10_000, ...over });
const offer = { id: "o1", reference: "WS-ABC123", token: "t".repeat(43), amounts: { kind: "subscription" as const, packageCode: "care" as const, packageName: "Care hosting", setupPence: 0, monthlyPence: 9500, oneOffPence: 0 } };

describe("POST /api/enquiry (hosting only, paid online)", () => {
  const fetchMock = vi.fn();
  const subjects = () => fetchMock.mock.calls.map((c) => (JSON.parse(String((c[1] as RequestInit).body)) as { subject?: string }).subject ?? "");
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubEnv("RESEND_API_KEY", "test-key");
    vi.stubEnv("ENQUIRY_TO_EMAIL", "inbox@example.com");
    vi.stubEnv("ENQUIRY_FROM_EMAIL", "site@example.com");
    vi.stubEnv("STORE_ON", "1");
    vi.mocked(saveEnquiry).mockClear();
    vi.mocked(createHostingOffer).mockReset().mockResolvedValue(offer);
    vi.mocked(createOfferCheckout).mockReset().mockResolvedValue({ id: "cs_test_1", url: "https://checkout.stripe.com/c/pay/cs_test_1", livemode: false });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("opens Stripe for the plan and emails nothing yet, because the owner is told after payment", async () => {
    const res = await post(hosting());
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, pay: { url: "https://checkout.stripe.com/c/pay/cs_test_1" }, paymentStarted: true });
    expect(saveEnquiry).toHaveBeenCalledOnce();
    expect(vi.mocked(createHostingOffer).mock.calls[0][1]).toMatchObject({ plan: "care", status: "have", siteUrl: "riverscafe.co.uk", email: "sam@riverscafe.co.uk" });
    expect(subjects()).toEqual([]);
  });

  it("makes the Stripe subscription from the offer, never from anything the browser sent", async () => {
    await post(hosting({ monthly: 1, price: 1, amount: 1 }));
    const params = vi.mocked(createOfferCheckout).mock.calls[0][1];
    expect(params.get("line_items[0][price_data][unit_amount]")).toBe("9500");
    expect(params.get("mode")).toBe("subscription");
    expect(params.get("success_url")).toContain("/subscribe/done?session_id=");
    expect(params.get("cancel_url")).toContain(`/subscribe/${offer.token}`);
  });

  it("takes the price from the plan on the server", async () => {
    await post(hosting({ plan: "hosting" }));
    expect(vi.mocked(createHostingOffer).mock.calls[0][1].plan).toBe("hosting");
  });

  it("needs the customer to agree to the terms before anything is saved", async () => {
    for (const agree of [undefined, false, "true"]) {
      const res = await post(hosting({ agree }));
      expect(res.status).toBe(422);
      expect((await res.json()).fields.agree).toBeDefined();
    }
    expect(saveEnquiry).not.toHaveBeenCalled();
    expect(createHostingOffer).not.toHaveBeenCalled();
  });

  it("tells the owner and sends the customer a payment link when Stripe's page can't be opened", async () => {
    vi.mocked(createOfferCheckout).mockRejectedValue(new Error("stripe down"));
    const res = await post(hosting());
    expect(await res.json()).toMatchObject({ ok: true, pay: null, paymentStarted: true });
    expect(subjects().some((s) => s.startsWith("Hosting request from"))).toBe(true);
    expect(subjects().some((s) => s.startsWith("Your hosting is waiting"))).toBe(true);
  });

  it("still takes the request when the offer can't be saved, and says a link will follow", async () => {
    vi.mocked(createHostingOffer).mockResolvedValue(null);
    const res = await post(hosting());
    expect(await res.json()).toMatchObject({ ok: true, pay: null, paymentStarted: false });
    expect(saveEnquiry).toHaveBeenCalledOnce();
    expect(createOfferCheckout).not.toHaveBeenCalled();
    expect(subjects().some((s) => s.startsWith("Hosting request from"))).toBe(true);
    expect(subjects().some((s) => s.startsWith("Thank you for choosing hosting"))).toBe(true);
  });

  it("refuses a made-up plan or a missing website address, and saves nothing", async () => {
    expect((await post(hosting({ plan: "platinum" }))).status).toBe(422);
    const noAddress = await post(hosting({ details: { ...details, existingWebsite: "" } }));
    expect(noAddress.status).toBe(422);
    expect((await noAddress.json()).fields.existingWebsite).toBeDefined();
    expect(saveEnquiry).not.toHaveBeenCalled();
  });

  it("notes that someone who needs a website was shown the ways we can build one", async () => {
    vi.mocked(createHostingOffer).mockResolvedValue(null);
    await post(hosting({ status: "need", details: { ...details, existingWebsite: "" } }));
    const body = vi.mocked(saveEnquiry).mock.calls[0][0].body;
    expect(body).toContain("I need a website");
    expect(body).toContain("from £999");
  });

  it("quietly ignores a robot that fills the hidden field", async () => {
    const res = await post(hosting({ website: "http://spam.example" }));
    expect(res.status).toBe(200);
    expect(saveEnquiry).not.toHaveBeenCalled();
    expect(createHostingOffer).not.toHaveBeenCalled();
  });
});
