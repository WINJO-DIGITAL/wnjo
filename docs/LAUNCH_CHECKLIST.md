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
- [x] **Staff subscriptions:** the staff read rule is unchanged in the database. Confirm by signing in as staff.
- [ ] **Sign-in link:** confirm the emailed link lands on the account page, not the home page.
- [x] **Live site:** Core shows £99 a month with no extra pages (checked on the live site).
- [x] **Preview check:** Plan & billing and the five-step bar checked on a phone-sized layout.
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

## Remaining list from the other Claude account (checked at 3b554bc)
Source: the handover list. Checked against `main` at `3b554bc`, which is the same commit as this branch.

### Needs the owner
- [ ] **Trust facts:** company number, registered address, VAT number, reviews, team photos and a guarantee. None have been invented.
- [ ] **Delivery timeline:** the "live in X days" line needs a real figure.
- [ ] **Real client before and after:** send screenshots to replace the example site in the refresh slider.
- [ ] **Terms:** the draft notice is on and no solicitor has reviewed the terms. Decide whether to publish them as they are.
- [ ] **Two tick boxes on the payment screen:** agreeing to the terms and the 14-day start waiver. Keep both unless the owner says otherwise.

### Needs testing (cannot be done from the build environment)
- [ ] **Test payment:** run a plan through Stripe test mode, including the confirmation page, the account and the owner email. Needs Stripe test keys.
- [ ] **Account form and reminder:** sign in as a customer and check the goals form, uploads and the reminder email.
- [ ] **Buy-outright request:** submit one end to end and check the proposal route in the staff admin.
- [ ] **Production builds:** check the production build of `3b554bc` on a phone and a desktop.

### Known issues, not fixed
- [ ] **Project package sizes:** the Essential, Professional and Premium cards pass page sizes the price form does not recognise, so they show "up to 5 pages".
- [ ] **Desktop header:** below 1184 px, "Services" only appears inside the phone menu.
- [ ] **Cost of `/build`:** a plan-less `/build` link still opens the form at Core £99. Only the site styler links to it. Not blocked yet.

### Suggested decisions
- [ ] **Refresh slider:** keep it as the main refresh visual (suggested).
- [ ] **Payment confirmation:** keep "Hi there" in the emails for customers who pay with only an email address (suggested).
