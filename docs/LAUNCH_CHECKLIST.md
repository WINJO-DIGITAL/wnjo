# Launch checklist

Working list for launching the AI-assisted website journey. Items marked **Decision** need the owner's answer before
they can be done. Nothing here is pushed or deployed until the owner says so.

## Done and tested
- [x] Package prices: Core £99, Plus £149, Pro £199 (setup fees match monthly prices). Pages are priced from each plan's own band.
- [x] Stripe payments are in GBP only (adaptive pricing off).
- [x] Deposits: 50% of a one-off website, taken from the quote, for every one-off package.
- [x] Revisions: two included rounds per website, enforced on the server and shown to the customer.
- [x] Customer accounts: websites, progress, proposals, payments, feedback, notifications, plan and billing.
- [x] Customers can only read their own websites, subscriptions and payments (row-level security, matched on sign-in email).
- [x] Billing button only opens the customer's own Stripe billing page. Email matching is exact (no wildcard matches).
- [x] Staff: builds, approvals (quality, pricing, contract, publication), subscriptions, orders and expected dates.
- [x] 421 automated tests pass; type checks and lint pass.

## Still to do before launch
- [ ] **Stripe billing page:** test with a test-mode subscription from a signed-in account (open Plan & billing, press Manage billing).
- [ ] **Sign-in link:** confirm the emailed link lands on the account page, not the home page.
- [ ] **Live site:** after the next merge, check Core shows £99 a month with no extra pages.
- [ ] **Preview check:** Plan & billing and the progress bar (five steps) on a phone.
- [ ] **Staff:** set expected dates on live websites so customers see them.
- [ ] **Test-mode subscription:** cancel the leftover Stripe test subscription (customer nitisatsirisom@hotmail.co.uk).

## Decisions needed from the owner
- [ ] **Privacy note:** the 30-day retention of unfinished drafts. Owner to choose the wording.
- [ ] **Ownership line when due:** the sentence shown once ownership is due. Currently hidden, with no replacement.
- [ ] **Ending care:** message only (current), or customers can also cancel in Stripe's billing page.
