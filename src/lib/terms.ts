/**
 * The version of the quote terms a client accepts. Stored with every acceptance so the agency can
 * show exactly which wording was agreed, and shown to the client when they accept. Bump this when the
 * terms change; never edit an old version. The owner confirmed the current terms on 7 November 2026
 * (earlier acceptances recorded the previous label, "quote-terms-draft-1"). 2026-11-08 adds the monthly
 * subscription section and states that the deposit and ownership clauses apply to bespoke projects. 2026-11-08.2
 * (draft, awaiting legal review) replaces it with website packages and ownership after 12 payments. 2026-11-10.2
 * (draft, awaiting owner approval and legal review) replaces that with managed website subscriptions: rolling
 * monthly, no minimum term, Winjo Refresh, and the customer keeping their domain and content while we keep our code.
 * 2026-11-10.3 (draft, awaiting a solicitor's check) redrafts the whole page in full: change allowances, notice to end,
 * handover of content and design files, price changes, non-payment, liability and governing law.
 */
export const QUOTE_TERMS_VERSION = "2026-11-10.5";
