# Launch checklist: open items

Only jobs still to do. Completed work is not listed here. Nothing here is pushed or deployed until the owner says so.

## Handover pack

- [ ] **Try one pack on a test website.** Build a test outright website, pay in test mode, download the pack as staff, hand over, then download it as the customer.

## Before launch

- [ ] **Read the new pages (owner).** Home, About, Work, Managed websites, Pricing, FAQ, WINJO Refresh, Privacy, Terms and the DPA.
- [ ] **Tune the template checks on a live run.** No further test runs are planned (decided 15 November). The claim, service and name rules are covered by automated tests only, so read the first real customer's site before it goes live.
- [ ] **Full audit before launch.**
  - Signed-in account and admin screens: every page and action, including what a customer sees of someone else's data.
  - Supabase database security advisor: row-level security on every table, and the brief pass (write-only, one brief, 48 hours).
  - Live payments: the plan checkout, the deposit and balance, the billing portal, and the webhook's handling of each event, including retries.
  - Public site: visual polish on phone and desktop, the buying path (tiers, hosting, six questions), wording, SEO and AEO markup.
  - Email layout and copy as sent in a real inbox, plus the terms wording for the exit clause.
  - The AI: the live reply shape, once the key is in.
