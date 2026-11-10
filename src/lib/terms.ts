/**
 * The version of the quote terms a client accepts. Stored with every acceptance so the agency can
 * show exactly which wording was agreed, and shown to the client when they accept. Bump this when the
 * terms change; never edit an old version. The owner confirmed the current terms on 7 November 2026
 * (earlier acceptances recorded the previous label, "quote-terms-draft-1"). 2026-11-08 adds the monthly
 * subscription section and states that the deposit and ownership clauses apply to bespoke projects. 2026-11-08.2
 * (draft, awaiting legal review) replaces it with website packages and ownership after 12 payments.
 */
export const QUOTE_TERMS_VERSION = "2026-11-10";
