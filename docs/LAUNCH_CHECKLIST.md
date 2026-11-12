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
- [x] 500 automated tests pass; type checks and lint pass.
- [x] Customer-facing AI wording removed: the build step reads "Building your website" (was "Planning your website").
- [x] Phone menu has a "Client sign-in" link.
- [x] Sign-in emails send as "WINJO DIGITAL <enquiries@winjodigital.co.uk>" through a Resend key for the verified domain, entered in the Supabase dashboard. Confirmed by the owner, 12 Nov.

## Done since the handover list (on main)
- [x] **Short checkout:** the name is required on the form and the server. The "New customer" stand-in is gone.
- [x] **Plans swipe on phones:** the pricing page plans swipe sideways, the same as the home page.
- [x] **Pricing hero:** "Choose a plan" is the only button; "Compare what each plan includes." is a plain underlined link.
- [x] **Managed websites hero:** the "On your own / With Winjo" switch drives the EV Exec walkthrough and its four jobs. Swipes on phones.
- [x] **Wording:** "Buy your website outright" is now "Own your website" in the menus, the project page and the App development link.
- [x] **Tagline kept:** "Your website. Our responsibility." stays as the brand tagline, in the footer, the metadata and the About page call to action. Decided by the owner.
- [x] **About page tidied:** the two long paragraphs are now short labelled tick lists, the statement is smaller, and the four engineering standards have three ticks each. Ticks now show on dark sections.
- [x] **Plan journey told truthfully:** "How it works" now reads Choose, Tell us, Build, Launch; the article describes the real plan checkout and the separate "Own your website" proposal route; the confirmation page says "Thank you, your payment is in" instead of "You're all set".
- [x] **Welcome email:** tells the customer to sign in and share their goals, pages and style, with the account link. No longer says the package "is set up".
- [x] **Numbered steps removed:** app development, contact "What happens next" and the confirmation page. Carousel position counters ("01 / 03") stay.
- [x] **"Own your website" used everywhere:** menu, project page title, home and pricing buttons and headings. "Every £99 plan" is now "every managed plan"; "£99/month" is "£99 a month".
- [x] **Remaining two-sentence headlines rewritten** on home, managed websites, pricing, booking systems and app development.
- [x] **Boonma on its own domain:** the case study, the work pages and the "Visit the live site" links now use `boonma.co.uk` (the owner confirmed it; `www.boonma.co.uk` redirects to it).
- [x] **Checkout details:** the pay screen asks for name, business name, email and an optional phone number. It also shows the 14-day delivery promise, the 30-day cancellation notice, and how to call or message us. The business name is required on the server too.
- [x] **Confirmation page no longer imports a server-only module** (it pulled Node's crypto into the browser bundle and broke the dev build).

## Still to do before launch
- [x] **Cancellation request:** test cancellation on WS-1C9980 (12 Nov). The customer confirmation gives the end date, 12 December 2026, and the staff alert was delivered. Owner confirmed. Not yet checked: the Stripe cancel-at-period-end flag and the history entry.
- [ ] **Renewal reminder:** confirm the 14-day reminder email reaches a test customer (no paid website qualifies yet, so use a test subscription).
- [x] **Hotmail delivery:** sign-in emails reached Hotmail once Microsoft's outage cleared. Owner confirmed, 12 Nov.
- [ ] **DMARC (optional):** add the record on winjodigital.co.uk (`_dmarc` TXT, `v=DMARC1; p=none; rua=mailto:enquiries@winjodigital.co.uk`). Helps Outlook accept our mail. Not added yet.
- [x] **Plan & billing:** test as a signed-in customer with a test plan (the plan list and Manage billing button). Not yet checked against production data. Confirmed by the owner: works.
- [x] **Staff subscriptions:** the staff read rule is unchanged in the database. Confirm by signing in as staff.
- [x] **Sign-in link:** confirm the emailed link lands on the account page, not the home page. The code sends it to `/account` (checked in code). Not yet tested with a real email. Confirmed by the owner: works, tested several times.
- [x] **Live site:** Core shows £99 a month with no extra pages (checked on the live site).
- [x] **Preview check:** Plan & billing and the five-step bar checked on a phone-sized layout.
- [x] **Staff:** expected date set on WNJO-D95245 (20 November, owner confirmed). WNJO-D59321 has no date until its goals arrive, because the 14-day promise counts from then.
- [x] **Test-mode subscription:** no subscriptions left in the database for the test customer. Confirm in the Stripe test dashboard.

## Grok switch-on (last step before launch)
- [x] Apply migration `20261109190000_website_ai_plans_and_previews.sql` (applied; tables and rules checked).
- [x] Customer preview permissions locked down: the secret preview address isn't readable from the browser.
- [ ] Set `XAI_API_KEY`, `XAI_MODEL`, `XAI_INPUT_PENCE_PER_MILLION_TOKENS` and `XAI_OUTPUT_PENCE_PER_MILLION_TOKENS` in Vercel (optional: `AI_MAX_PENCE_PER_BRIEF`, default 300).
- [x] Run one test website end to end: pay in test mode, check the plan and preview appear in Admin, view the draft, release it, and open it from the customer account. Confirmed by the owner (already done).
- [ ] Check the model's reply shape against the live service. The code was only tested against a fake.

## Decisions needed from the owner
- [x] ICO data protection fee: registered and Direct Debit set up (owner, 12 Nov). Application number C2085772. The ICO sends the registration confirmation within three working days, with the registration number.
- [x] ICO registration number on the privacy page: done for now. The owner will pass on the number from the ICO's confirmation email, and it goes on the privacy page then.
- [x] Privacy note: the 30-day retention of unsent briefs is on the privacy page.
- [x] Ownership line when due: "Ownership is available to you now. Message us whenever you'd like to talk it through."
- [x] Ending care: message only.

## Remaining list from the other Claude account (checked at 3b554bc)
Source: the handover list. Checked against `main` at `3b554bc`, which is the same commit as this branch.

### Needs the owner
- [x] **Trust facts:** done. Sole trader, so no company number. The registered address is in the terms. Not VAT registered. No reviews yet (new business). One-person business, so no team photos. The guarantees are as already agreed.
- [x] **Delivery timeline:** decided. A managed website is live within 14 days of us having the customer's goals, pages and style. Shown on the pay screen and in the welcome email (`DELIVERY` in `src/lib/pricing.ts`).
- [x] **Refresh slider:** decided. Keep the before-and-after with the Harbour Kitchen example, labelled as an example, using the owner's three photos (launch, first refresh, second refresh). The owner confirms the photos are licensed for use.
- [x] **Terms:** agreed. Published as drafted, without a solicitor review.
- [x] **Two tick boxes on the payment screen:** kept, under a "Before you pay" heading, with plainer wording. The owner is happy with them.

### Needs testing (cannot be done from the build environment)
- [x] **Test payment:** run a plan through Stripe test mode, including the confirmation page, the account and the owner email. Needs Stripe test keys. Confirmed by the owner several times: payments go through, and both the owner and the customer get an email.
- [x] **Owner email after payment:** pay a plan in Stripe test mode and confirm exactly one owner email arrives, after the payment ("New … subscription"), and none when the form is submitted. Confirmed by the owner: the owner gets an email after payment.
- [x] **Customer emails after payment:** pay a plan in Stripe test mode and confirm the customer gets only the welcome email, with no "Your website is waiting" email and no "Tell us about your website" reminder for a day or until the goals form is filled in. Confirmed by the owner: the customer gets an email after payment.
- [ ] **Goals email right after payment:** the payment email now leads with the details form (subject "Thank you. Now tell us about your website"), and one-off payments ask for it too. It is only asked while the goals are missing. Check one test payment: the email arrives straight after paying, with the sign-in link.
- [ ] **Account form and reminder:** goals form checked on WNJO-DEMO02 from a screen recording (11 Nov, 15:48): goals and pages saved, and the status moved to "We're building your website". Uploads were checked on WNJO-DEMO03 (owner, 12 Nov); the owner then found the file list messy with no way to view a file, now fixed (thumbnail, View link, tidier rows; checked on the live site by the owner, 12 Nov: thumbnails and View links work). Still open: the reminder email, which needs a paid website with no goals, or a real customer in that state.
- [ ] **Buy-outright request:** submit one end to end and check the proposal route in the staff admin.
- [x] **Production builds:** checked on the live site for `4a82cb4`. The Winjo Refresh photos and "Own your website" wording are being served. Winjo Refresh and pricing look right on a phone (390px) and a desktop (1280px), with no sideways overflow and no page errors.

### Known issues, not fixed
- [x] **Project package sizes:** the cards now pass the form's own sizes (Essential up to 5, Professional 11 to 15, Premium more than 20 pages), read from the form's size list, with a test.
- [x] **Desktop header:** the full menu, with Services, now shows from 1024 px (was 1184 px). Checked on one row at 1024, 1100, 1183 and 1280 px.
- [x] **Cost of `/build`:** a plan-less `/build` now goes to the plans. Plan, project, care, draft and `?full=1` links still open the form. The site styler links to the plans directly.

### Suggested decisions
- [x] **Payment confirmation:** decided by the owner: customers can no longer pay with only an email address. The name and business name are required at checkout, and the server refuses a payment without them, so "Hi there" only appears in older records saved before this rule.
