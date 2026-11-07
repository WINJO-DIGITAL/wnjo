import "server-only";
import { createQuote, serviceClient } from "@/lib/quote-store";
import { WNJO_TENANT_ID } from "@/lib/enquiry-store";

/**
 * Issues a written quote the moment a price brief arrives, using the same server price engine staff use. The
 * customer's business becomes a client organisation and their email is invited to it, so the quote is waiting in
 * their account when they sign in. Returns null when the database isn't configured or the enquiry can't be found;
 * the caller treats any failure as "no instant quote" and the enquiry itself is unaffected.
 */
export async function issueInstantQuote(input: {
  enquiryReference: string;
  name: string;
  email: string;
  company?: string;
  answers: unknown;
}): Promise<{ quoteReference: string } | null> {
  const db = serviceClient();
  if (!db) return null;

  const { data: enquiry } = await db
    .from("enquiries")
    .select("id")
    .eq("reference", input.enquiryReference)
    .maybeSingle();
  if (!enquiry) return null;

  const { data: org, error: orgError } = await db
    .from("organizations")
    .insert({ tenant_id: WNJO_TENANT_ID, name: (input.company || input.name).slice(0, 160) })
    .select("id")
    .single();
  if (orgError || !org) throw new Error("Could not create the client organisation");
  const organizationId = (org as { id: string }).id;

  const { error: inviteError } = await db
    .from("organization_invites")
    .insert({ tenant_id: WNJO_TENANT_ID, organization_id: organizationId, email: input.email.trim().toLowerCase() });
  if (inviteError) throw new Error("Could not invite the client");

  const created = await createQuote({
    tenantId: WNJO_TENANT_ID,
    organizationId,
    enquiryId: (enquiry as { id: string }).id,
    answers: input.answers,
  });
  return { quoteReference: created.reference };
}
