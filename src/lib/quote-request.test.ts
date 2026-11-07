import { describe, expect, it } from "vitest";
import { parseQuoteRequest } from "@/lib/quote-request";

const ID = "11111111-1111-4111-8111-111111111111";
const ORG = "22222222-2222-4222-8222-222222222222";

describe("parseQuoteRequest", () => {
  it("accepts an enquiry with no client organisation yet", () => {
    expect(parseQuoteRequest({ enquiryId: ID })).toEqual({ ok: true, enquiryId: ID, organizationId: null });
  });

  it("accepts an enquiry with a chosen client organisation", () => {
    expect(parseQuoteRequest({ enquiryId: ID, organizationId: ORG })).toEqual({ ok: true, enquiryId: ID, organizationId: ORG });
  });

  it("refuses a bad enquiry id or organisation id", () => {
    expect(parseQuoteRequest({ enquiryId: "x" }).ok).toBe(false);
    expect(parseQuoteRequest({ enquiryId: ID, organizationId: "drop table" }).ok).toBe(false);
    expect(parseQuoteRequest(null).ok).toBe(false);
  });
});
