import { describe, expect, it } from "vitest";
import { enquiryRow, WNJO_TENANT_ID } from "@/lib/enquiry-store";

const base = { reference: "WNJO-ABC123", name: "Sam", email: "sam@example.test", subject: "s", body: "b" };

describe("enquiryRow", () => {
  it("names the agency, which the database requires", () => {
    expect(enquiryRow({ ...base, kind: "contact" }, WNJO_TENANT_ID).tenant_id).toBe(WNJO_TENANT_ID);
  });

  it("keeps brief answers for briefs and drops them for contact messages", () => {
    const answers = { projectType: "website" };
    expect(enquiryRow({ ...base, kind: "brief", answers }, WNJO_TENANT_ID).answers).toEqual(answers);
    expect(enquiryRow({ ...base, kind: "contact", answers }, WNJO_TENANT_ID).answers).toBeNull();
  });

  it("writes empty optional fields as null, not as blanks", () => {
    const row = enquiryRow({ ...base, kind: "contact" }, WNJO_TENANT_ID);
    expect(row.company).toBeNull();
    expect(row.budget).toBeNull();
  });
});
