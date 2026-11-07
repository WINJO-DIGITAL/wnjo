/** Checks a staff request to issue a quote from a brief enquiry. Pure, so the input rules are tested directly. */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseQuoteRequest(input: unknown): { ok: true; enquiryId: string; organizationId: string | null } | { ok: false; reason: string } {
  if (!input || typeof input !== "object") return { ok: false, reason: "The quote request is missing." };
  const body = input as Record<string, unknown>;
  if (typeof body.enquiryId !== "string" || !UUID.test(body.enquiryId)) return { ok: false, reason: "That enquiry doesn't exist." };
  if (body.organizationId === undefined || body.organizationId === null || body.organizationId === "") {
    return { ok: true, enquiryId: body.enquiryId, organizationId: null };
  }
  if (typeof body.organizationId !== "string" || !UUID.test(body.organizationId)) return { ok: false, reason: "That client organisation doesn't exist." };
  return { ok: true, enquiryId: body.enquiryId, organizationId: body.organizationId };
}
