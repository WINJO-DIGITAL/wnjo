import { describe, expect, it } from "vitest";
import { messagesToAnswer, websitesToMake, type EnquiryLite, type TodayBrief } from "./today";

const brief = (over: Partial<TodayBrief>): TodayBrief => ({
  id: "b1", reference: "WNJO-111111", name: "Ada Lake", business_name: "Lake Bakery", route: "package", stage: "specification", expected_by: null,
  created_at: "2026-11-01T09:00:00Z", brief: { goals: ["enquiries"] }, ...over,
});
const enq = (over: Partial<EnquiryLite>): EnquiryLite => ({ id: "e1", reference: "WNJO-222222", kind: "contact", name: "Bo Reed", email: "bo@reed.test", topic: null, created_at: "2026-11-02T09:00:00Z", handled_at: null, ...over });

describe("websites to make", () => {
  it("lists only the briefs a person has to act on", () => {
    const stages = ["brief_received", "reviewing", "proposal", "awaiting_payment", "specification", "building", "preview", "changes", "approval", "live", "on_hold", "closed"];
    const shown = websitesToMake(stages.map((stage, i) => brief({ id: `b${i}`, stage })));
    expect(shown.map((j) => j.status).sort()).toEqual(["Being built", "Brief to review", "Brief to review", "Changes to make", "Ready to build"]);
  });

  it("says what is waiting: customer details missing, or ready to build", () => {
    expect(websitesToMake([brief({ brief: { goals: [] } })])[0].status).toBe("Waiting for their details");
    expect(websitesToMake([brief({ brief: null })])[0].status).toBe("Waiting for their details");
    expect(websitesToMake([brief({})])[0].status).toBe("Ready to build");
  });

  it("puts changes first, then ready to build, then the soonest promised date, then the oldest", () => {
    const jobs = websitesToMake([
      brief({ id: "wait", brief: { goals: [] } }),
      brief({ id: "later", expected_by: "2026-12-20", created_at: "2026-11-05T00:00:00Z" }),
      brief({ id: "changes", stage: "changes", created_at: "2026-11-09T00:00:00Z" }),
      brief({ id: "sooner", expected_by: "2026-12-01", created_at: "2026-11-08T00:00:00Z" }),
      brief({ id: "nodate-old", created_at: "2026-11-02T00:00:00Z" }),
      brief({ id: "building", stage: "building" }),
    ]);
    expect(jobs.map((j) => j.id)).toEqual(["changes", "sooner", "later", "nodate-old", "building", "wait"]);
  });

  it("tags each as monthly or bespoke, names the business, and links straight to the website", () => {
    const [monthly] = websitesToMake([brief({ id: "11111111-1111-4111-8111-111111111111" })]);
    expect(monthly).toMatchObject({ kind: "Monthly", who: "Lake Bakery", href: "#builds/11111111-1111-4111-8111-111111111111" });
    expect(websitesToMake([brief({ route: "proposal" })])[0].kind).toBe("Bespoke");
    expect(websitesToMake([brief({ business_name: null })])[0].who).toBe("Ada Lake");
    expect(websitesToMake([brief({ business_name: null, name: "" })])[0].who).toBe("WNJO-111111");
  });
});

describe("messages to answer", () => {
  it("lists only the unanswered, newest first, and tells a message from a new enquiry", () => {
    const items = messagesToAnswer([
      enq({ id: "old", created_at: "2026-11-01T00:00:00Z" }),
      enq({ id: "done", handled_at: "2026-11-03T00:00:00Z" }),
      enq({ id: "lead", kind: "website", created_at: "2026-11-04T00:00:00Z" }),
    ]);
    expect(items.map((m) => m.id)).toEqual(["lead", "old"]);
    expect(items.map((m) => m.what)).toEqual(["Website enquiry", "Message"]);
  });

  it("falls back to the email when there is no name", () => {
    expect(messagesToAnswer([enq({ name: "" })])[0].who).toBe("bo@reed.test");
  });
});
