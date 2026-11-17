# Launch checklist

Only the work still open before launch. Completed items are in git history (this file before 17 November 2026).
Nothing here is pushed or deployed until the owner says so.

## Remaining (17 November 2026)

- [ ] **1. Handover pack test.** Build one test outright website, pay in test mode, download the pack as staff, hand it over, then download it as the customer.
- [ ] **2. Read the new pages (owner).** Home, About, Work, Managed websites, Pricing, FAQ, WINJO Refresh, Privacy, Terms and the DPA.
- [ ] **3. Tune the template checks on a live run.** Read the first real customer's site before it goes live.
- [ ] **4. Full audit before launch.**
  - Signed-in account and admin screens: every page and action, including what a customer sees of someone else's data.
  - Supabase security advisor: row-level security on every table, and the brief pass (write-only, one brief, 48 hours).
  - Live payments: the plan checkout, the deposit and balance, the billing portal, and the webhook's handling of each event, including retries.
  - Public site on phone and desktop: visual polish, the buying path (tiers, hosting, six questions), wording, SEO and AEO markup.
  - Emails in a real inbox: layout and copy as sent, plus the terms wording for the exit clause.
  - The AI's live reply shape, once the key is in.
