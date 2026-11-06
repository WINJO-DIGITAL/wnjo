import type { Answers } from "@/lib/pricing";
import { quote, type Catalogue } from "@/lib/quote-engine";

/**
 * Builds the rows for a new quote and its first version. Pure: no database access, so the rules
 * (references, validity period, line-item order, snapshot contents) are unit-tested here.
 * The server stores these rows with its secret key (see quote-store.ts).
 */

export const QUOTE_VALID_DAYS = 30;

/** A reference such as Q-3FA91C0B: short enough to read out, unlikely to collide. */
export function quoteReference(randomBytes: Uint8Array): string {
  const hex = Array.from(randomBytes.slice(0, 4), (b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
  return `Q-${hex}`;
}

export type QuoteRecords = {
  quote: {
    tenant_id: string;
    reference: string;
    organization_id: string | null;
    enquiry_id: string | null;
    status: "sent";
    expires_at: string;
    latest_version: 1;
  };
  version: {
    tenant_id: string;
    version: 1;
    answers: Answers;
    catalogue_snapshot: Catalogue;
    package_code: string;
    build_pence: number;
    range_low_pence: number;
    range_high_pence: number;
    monthly_pence: number;
    requires_scope: boolean;
    scope_reasons: string[];
  };
  items: { tenant_id: string; position: number; label: string; amount_pence: number }[];
};

export function buildQuoteRecords(input: {
  tenantId: string;
  reference: string;
  organizationId: string | null;
  enquiryId: string | null;
  answers: Answers;
  catalogue: Catalogue;
  now: Date;
}): QuoteRecords {
  const result = quote(input.answers, input.catalogue);
  const expires = new Date(input.now.getTime() + QUOTE_VALID_DAYS * 24 * 60 * 60 * 1000);
  // Deep copy, so later changes to the caller's objects can't alter what is stored.
  const snapshot = JSON.parse(JSON.stringify(input.catalogue)) as Catalogue;
  return {
    quote: {
      tenant_id: input.tenantId,
      reference: input.reference,
      organization_id: input.organizationId,
      enquiry_id: input.enquiryId,
      status: "sent",
      expires_at: expires.toISOString(),
      latest_version: 1,
    },
    version: {
      tenant_id: input.tenantId,
      version: 1,
      answers: JSON.parse(JSON.stringify(input.answers)) as Answers,
      catalogue_snapshot: snapshot,
      package_code: result.packageCode,
      build_pence: result.buildPence,
      range_low_pence: result.rangePence.low,
      range_high_pence: result.rangePence.high,
      monthly_pence: result.monthlyPence,
      requires_scope: result.requiresScope,
      scope_reasons: result.scopeReasons,
    },
    items: result.lineItems.map((item, position) => ({
      tenant_id: input.tenantId,
      position,
      label: item.label,
      amount_pence: item.amountPence,
    })),
  };
}
