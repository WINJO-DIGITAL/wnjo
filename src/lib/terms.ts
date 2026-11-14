/**
 * The version of the quote terms a client accepts. Stored with every acceptance so the agency can
 * show exactly which wording was agreed, and shown to the client when they accept. Bump this when the
 * terms change; never edit an old version. The owner confirmed the current terms on 7 November 2026
 * (earlier acceptances recorded the previous label, "quote-terms-draft-1"). 2026-11-08 adds the monthly
 * subscription section and states that the deposit and ownership clauses apply to bespoke projects. 2026-11-08.2
 * (draft, awaiting legal review) replaces it with website packages and ownership after 12 payments. 2026-11-10.2
 * (draft, awaiting owner approval and legal review) replaces that with managed website subscriptions: rolling
 * monthly, no minimum term, WINJO Refresh, and the customer keeping their domain and content while we keep our code.
 * 2026-11-10.3 (draft, awaiting a solicitor's check) redrafts the whole page in full: change allowances, notice to end,
 * handover of content and design files, price changes, non-payment, liability and governing law.
 * 2026-11-14.1 limits the design files to customers who have paid for 3 months, and keeps the site live for 7 days after
 * the end date (was 30). Content is still handed over within 14 days.
 * 2026-11-14.2 includes the wording we wrote for the website in the content handed over straight away.
 */
export const QUOTE_TERMS_VERSION = "2026-11-14.2";
