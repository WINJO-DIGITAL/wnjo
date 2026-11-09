# Launch checklist

Working list for launching the AI-assisted website journey. Items marked **Decision** need the owner's answer before
they can be done. Nothing here is pushed or deployed until the owner says so.

## Done and tested
- [x] Package prices: Core £99, Plus £149, Pro £199 (setup fees match monthly prices). Pages are priced from each plan's own band.
- [x] Stripe payments are in GBP only (adaptive pricing off).
- [x] Deposits: 50% of a one-off website, taken from the quote, for every one-off package.
- [x] Revisions: two included rounds per website, enforced on the server and shown to the customer.
- [x] Customer accounts: websites, progress, proposals, payments, feedback, notifications, plan and billing.
- [x] Customers read their own websites through row-level security. Their plans are read through a function that returns only the fields the account shows (migration applied in production).
- [x] Billing button only opens the customer's own Stripe billing page. Email matching is exact (no wildcard matches).
- [x] Staff: builds, approvals (quality, pricing, contract, publication), subscriptions, orders and expected dates.
- [x] Admin screens on desktop and phone: enquiries, quotes, approvals, projects, orders and subscriptions.
- [x] 461 automated tests pass; type checks and lint pass.
- [x] Customer-facing AI wording removed: the planning step reads "Planning your website".
- [x] Phone menu has a "Client sign-in" link.

## Still to do before launch
- [ ] **Plan & billing:** test as a signed-in customer with a test plan (the plan list and Manage billing button). Not yet checked against production data.
- [ ] **Staff subscriptions:** confirm the full list still loads for staff after the database change.
- [ ] **Sign-in link:** confirm the emailed link lands on the account page, not the home page.
- [ ] **Live site:** after the next merge, check Core shows £99 a month with no extra pages.
- [ ] **Preview check:** Plan & billing and the progress bar (five steps) on a phone.
- [ ] **Staff:** set expected dates on live websites so customers see them.
- [x] **Test-mode subscription:** no subscriptions left in the database for the test customer. Confirm in the Stripe test dashboard.

## Grok switch-on (last step before launch)
- [x] Apply migration `20261109190000_website_ai_plans_and_previews.sql` (applied; tables and rules checked).
- [x] Customer preview permissions locked down: the secret preview address isn't readable from the browser.
- [ ] Set `XAI_API_KEY`, `XAI_MODEL`, `XAI_INPUT_PENCE_PER_MILLION_TOKENS` and `XAI_OUTPUT_PENCE_PER_MILLION_TOKENS` in Vercel (optional: `AI_MAX_PENCE_PER_BRIEF`, default 300).
- [ ] Run one test website end to end: pay in test mode, check the plan and preview appear in Admin, view the draft, release it, and open it from the customer account.
- [ ] Check the model's reply shape against the live service. The code was only tested against a fake.

## Decisions needed from the owner
- [x] Privacy note: the 30-day retention of unsent briefs is on the privacy page.
- [x] Ownership line when due: "Ownership is available to you now. Message us whenever you'd like to talk it through."
- [x] Ending care: message only.
