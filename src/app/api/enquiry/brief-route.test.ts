import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { createBrief } from "@/lib/brief-store";
import { DEFAULT_WEBSITE_ANSWERS } from "@/lib/website-quote";

vi.mock("@/lib/enquiry-store", () => ({
  WNJO_TENANT_ID: "00000000-0000-4000-8000-000000000001",
  enquiryStoreConfigured: () => true,
  saveEnquiry: vi.fn(async () => true),
}));
vi.mock("@/lib/instant-quote", () => ({ issueInstantQuote: vi.fn(async () => null) }));
vi.mock("@/lib/quote-store", () => ({ serviceClient: () => ({}) }));
vi.mock("@/lib/rate-limit-shared", () => ({
  LIMITS_PER_ROUTE: { enquiry: { max: 5, windowSeconds: 600 } },
  sharedRateLimited: async () => false,
}));
vi.mock("@/lib/brief-store", () => ({
  confirmBriefFiles: vi.fn(async (_db: unknown, _id: string, brief: { files: { path: string }[] }) => ({
    ...brief,
    files: brief.files.filter((f) => !f.path.endsWith("missing.png")),
  })),
  createBrief: vi.fn(async () => ({ id: "b1", route: "proposal" })),
}));

const DRAFT = "3f1c2a4e-9b7d-4c2a-8e1f-0a1b2c3d4e5f";
let ip = 0;
const post = (body: unknown) =>
  POST(
    new NextRequest("http://localhost/api/enquiry", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": `10.2.0.${++ip}` },
      body: JSON.stringify(body),
    }),
  );
const details = {
  name: "Ada Lovelace",
  businessName: "Analytical Engines Ltd",
  email: "Ada@Example.com",
  phone: "",
  industry: "Engineering",
  existingWebsite: "",
  description: "We build calculating machines for local businesses.",
  customers: "",
  launchDate: "",
  requirements: "",
};
const brief = {
  goals: ["bookings"],
  goalNote: "",
  pages: ["Home", "Book online"],
  style: "warm",
  references: ["example.com"],
  colours: "",
  avoid: "",
  functionality: "",
  files: [
    { path: `drafts/${DRAFT}/a-logo.png`, name: "logo.png", size: 100, type: "image/png" },
    { path: `drafts/${DRAFT}/b-missing.png`, name: "missing.png", size: 100, type: "image/png" },
  ],
};
const body = (over: Record<string, unknown> = {}) => ({
  kind: "website",
  intent: "quote",
  answers: { ...DEFAULT_WEBSITE_ANSWERS, mode: "oneOff", want: "oneOff", pages: "6-10" },
  details,
  brief,
  draftId: DRAFT,
  startedAt: Date.now() - 10_000,
  ...over,
});

describe("POST /api/enquiry (website brief)", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubEnv("RESEND_API_KEY", "test-key");
    vi.stubEnv("ENQUIRY_TO_EMAIL", "inbox@example.com");
    vi.stubEnv("ENQUIRY_FROM_EMAIL", "site@example.com");
    vi.mocked(createBrief).mockClear();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("stores the brief with only the files really uploaded, and says it can be tracked", async () => {
    const res = await post(body());
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, route: "proposal", tracked: true });
    const saved = vi.mocked(createBrief).mock.calls[0][1];
    expect(saved.draftId).toBe(DRAFT);
    expect(saved.brief.files.map((f) => f.name)).toEqual(["logo.png"]);
    expect(saved.brief.references).toEqual(["https://example.com/"]);
    expect(saved.quote.oneOffTotal).toBe(1999);
  });

  it("puts the brief in the owner's email", async () => {
    await post(body());
    const owner = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(owner.text).toContain("Goals: Online bookings");
    expect(owner.text).toContain("Pages (2): Home, Book online");
  });

  it("rejects a brief with no goals", async () => {
    const res = await post(body({ brief: { ...brief, goals: [] } }));
    expect(res.status).toBe(422);
    expect((await res.json()).brief.goals).toBeTruthy();
    expect(createBrief).not.toHaveBeenCalled();
  });

  it("ignores files from someone else's draft", async () => {
    await post(body({ draftId: "11111111-1111-4111-8111-111111111111" }));
    expect(vi.mocked(createBrief).mock.calls[0][1].brief.files).toEqual([]);
  });

  it("still accepts a quote from an older page without a brief, without tracking it", async () => {
    const res = await post(body({ brief: undefined, draftId: undefined }));
    expect(res.status).toBe(200);
    expect((await res.json()).tracked).toBe(false);
    expect(createBrief).not.toHaveBeenCalled();
  });
});
