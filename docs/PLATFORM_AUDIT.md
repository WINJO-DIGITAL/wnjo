# Platform audit: the website generation system (15 November 2026)

Audit only. Nothing was changed. Checked at `1f19657` on `main`.

## How this was checked

- Read the code for the generation pipeline, renderer, forms, enquiry route, preview route, build service, config and docs.
- Ran the Supabase security advisor on the production database.
- Used the screenshots taken on 14 November of five sample sites (barber, café, electrician, massage, building, plumbing) at 390 px and 1280 px.
- Automated tests at the last run: 105 files, 1,212 passing, 1 skipped.

Not checked: real Haiku output since the redesign, a real phone, a tablet width, Lighthouse or axe on a generated site, live payments, signed-in account and admin screens, emails in an inbox. Scores below say where a number is a judgement and not a measurement.

## 1. Overall assessment

The safety side is strong. The model writes very little, everything it writes is checked, a person releases every site, and spend is capped at £1. That part is better than most products in this market.

The product side is not ready. Three things stop it being a website generation platform today:

1. **A generated site can't go live.** It exists only as a private, no-index preview at `/site-preview/<token>`. `docs/AI_BUILD_SPEC.md` says hosting on the customer's domain is "Not designed".
2. **Every site in a sector looks and reads almost the same.** One component, system fonts, three CSS arrangements, and fixed headings and button text per sector. Two barbers get the same "Ready for a fresh cut?".
3. **There is no real-browser testing of generated sites.** All 1,212 tests are unit tests. Nothing clicks a link, submits the form or measures a page.

Yesterday's work (multi-page, layouts, redesign) was mine, and I shipped it on five screenshots and unit tests. This audit found a customer-journey bug in it (finding 2).

## 2. Scores

| Category | Score | Basis |
|---|---|---|
| Visual design | 11 / 20 | Judgement from five sample screenshots and the code. |
| Conversion and UX | 9 / 15 | Judgement, plus two confirmed defects (findings 2 and 3). |
| Functionality | 8 / 15 | Code reading. No live hosting, logo never shown. |
| Responsive design | 6 / 10 | Two widths, five samples, by eye. No tablet, no automation. |
| Backend and data integrity | 6 / 10 | Advisor run, code reading. Leads aren't stored. |
| Performance | 3 / 10 | Not measured. Scored on known causes (finding 5). |
| SEO | 1 / 8 | Generated sites have no title, description, structured data or indexable address. |
| Accessibility | 4 / 7 | Code reading only. No axe run. |
| Security and reliability | 3.5 / 5 | Advisor: no errors, 10 warnings. No monitoring, no CI. |
| **Total** | **51.5 / 100** | Target is 95. |

**Release blockers, whatever the total:** findings 1, 2 and 3 (customer journey), and finding 5 until measured.

## 3. The 20 most important improvements

Effort: S is under a day, M is one to three days, L is a week or more.

### 1. Generated sites can't be published (Critical, L)
- **Problem:** the only place a site is shown is the private preview. No route serves it on a domain, as an indexable page.
- **Evidence:** `src/app/site-preview/[token]/page.tsx` (`robots: { index: false }`); `docs/AI_BUILD_SPEC.md` lines 100 and 121.
- **Why it matters:** the customer pays for a live website and can't have one.
- **Fix:** a public site route keyed by hostname, with real paths per page, and domains attached through Vercel. Needs an owner decision first (section 10).
- **Test:** browser test that loads a published sample on a test hostname, walks every page and submits the form.

### 2. The request form loses its confirmation on multi-page sites (Critical, S)
- **Problem:** after sending, the visitor is redirected to `/site-preview/<token>?sent=1#book` with no page. On a multi-page site the form is on Contact, so they land on Home with no confirmation.
- **Evidence:** `src/app/api/site-enquiry/route.ts` (`back()`); `layoutPages` moves the form to Contact. Found by reading the code, not yet reproduced in a browser.
- **Why it matters:** the visitor thinks it failed and sends again or leaves.
- **Fix:** redirect back to the page the form was on.
- **Test:** browser test submits the form on a five-page site and sees "Request sent".

### 3. Leads are emailed but never stored (Critical, S)
- **Problem:** a booking request is only sent by email. If the email fails or lands in spam, it is gone.
- **Evidence:** `src/app/api/site-enquiry/route.ts` has no insert; `src/lib/site-template/enquiry.ts` has none either.
- **Why it matters:** a lost lead is the worst failure a business website can have.
- **Fix:** save each request to a table first, then email. Show them in the customer's account.
- **Test:** unit test that a request is saved when the mailer fails; database test for the access rules.

### 4. Sites in a sector are near-identical (High, L)
- **Problem:** headings, button text, the request intro and the closing line are fixed per sector. The model writes only a tagline, headline, intro, page headings and FAQ.
- **Evidence:** `copy` in `src/lib/site-template/presets.ts`; `SHAPE` in `write.ts`.
- **Why it matters:** this is what makes a site read as a template.
- **Fix:** let the model choose headings and the closing line from the customer's own answers, under the same checks. Add a second set of fixed wording per sector as the fallback.
- **Test:** two different businesses in one sector must share no heading or closing line; all checks still pass.

### 5. Customer photos are served raw (High, M)
- **Problem:** uploads of up to 20 MB are shown at full size, with no resizing, no width and height, and no priority on the hero.
- **Evidence:** `BRIEF_UPLOAD.maxBytes` in `src/lib/website-brief.ts`; plain `<img>` in `SiteRender.tsx`; signed links in the preview route.
- **Why it matters:** a phone on mobile data could wait many seconds for the first screen, and the page jumps as images load.
- **Fix:** resize on upload or serve through Supabase image transforms, store dimensions, set `fetchpriority` on the hero.
- **Test:** Lighthouse on a sample with 5 MB photos; budget for largest image paint and layout shift.

### 6. The customer's logo is never shown (High, S)
- **Problem:** the form asks for a logo, and the site shows the business name as text.
- **Evidence:** `pickPhotos` excludes logos; the header in `SiteRender.tsx` is `<b>{business.name}</b>`.
- **Why it matters:** a business with a logo will reject a site without it.
- **Fix:** show the logo in the header and footer when one is marked, with the name as its text alternative.
- **Test:** render test with and without a logo.

### 7. Generated sites have no SEO at all (High, M)
- **Problem:** no page title, description, social image, LocalBusiness data or sitemap per site.
- **Evidence:** the preview route sets one fixed title, "Website preview".
- **Why it matters:** the site can't be found. Depends on finding 1.
- **Fix:** build metadata and structured data from the facts (name, address, hours, phone). No model involved.
- **Test:** unit tests on the metadata; browser test reads the tags.

### 8. No real-browser tests (High, M)
- **Problem:** nothing loads a generated site in a browser.
- **Evidence:** `package.json` has only `vitest`; no Playwright tests in the repo; `docs/TESTING.md`.
- **Why it matters:** finding 2 would have been caught.
- **Fix:** a Playwright suite over every sector, layout and page count: every link, the form, console errors, phone and desktop.
- **Test:** the suite is the test. Run before every merge.

### 9. Nothing runs the tests automatically (High, S)
- **Problem:** no CI. Tests, types and lint run only when someone remembers.
- **Evidence:** no `.github` folder; `vercel.json` has only cron jobs.
- **Why it matters:** a broken change can reach production.
- **Fix:** a GitHub Action for types, lint and tests on every push.
- **Test:** a deliberately failing branch is blocked.

### 10. Typography is system fonts only (High, M)
- **Problem:** the four looks use whatever fonts the device has. "Classic" is Georgia.
- **Evidence:** `--head` in `SiteRender.module.css`.
- **Why it matters:** type is most of what makes a site look designed.
- **Fix:** three or four self-hosted font pairings, loaded per look.
- **Test:** screenshots per look; font weight budget.

### 11. "Never invent" is only half enforced (High, M)
- **Problem:** the headline, intro, tagline and page headings are checked for prices, phone numbers and banned claims, but not against the customer's facts. The FAQ check is a word-overlap rule that can be fooled or can reject honest answers.
- **Evidence:** the `faq-not-from-facts` block in `checks.ts`; no equivalent for the hero.
- **Why it matters:** you asked for this to be hard-coded. For the FAQ it is approximate; for the hero it relies on the prompt.
- **Fix:** apply the grounding check to every model-written line, and measure it against real Haiku output before trusting the threshold.
- **Test:** a set of real model replies, labelled by hand, with the check's hit and miss rate.

### 12. The quality of real output is unmeasured (High, M)
- **Problem:** the rating buttons save to a table that nothing reads. The live test hasn't been run since the redesign.
- **Evidence:** `template_test_ratings`; `eval.test.ts` is skipped.
- **Fix:** a results view of pass rate and ratings per template, and a release rule (for example 8 in 10 rated good).
- **Test:** the view itself, on a full run.

### 13. Any colour is accepted (Medium, S)
- **Problem:** the form offers six dark swatches, but the server accepts any hex. A pale colour makes prices and links unreadable.
- **Evidence:** `COLOUR` in `answers.ts`; `.price { color: var(--accent) }`.
- **Fix:** accept only the swatches, or reject colours that fail contrast.
- **Test:** unit test with a pale colour.

### 14. Photo descriptions are generic (Medium, S)
- **Problem:** gallery pictures get "Business name photo" as their description.
- **Evidence:** `write.ts` line 272.
- **Why it matters:** poor for screen readers and for search.
- **Fix:** ask the customer for a few words per photo in the form.
- **Test:** check flags a generic description.

### 15. Plans and pages can contradict each other (Medium, S)
- **Problem:** Essential removes the FAQ, but the customer can still choose an FAQs page. A Gallery page can be chosen with no photos. Both fail the build late.
- **Evidence:** `applyPlan` in `plans.ts`; `page-missing` in `checks.ts`.
- **Fix:** the form only offers pages that can be filled.
- **Test:** form validation tests.

### 16. Plus and Pro can't use their page allowance (Medium, M)
- **Problem:** plans allow 10 and 20 pages; templates build 6.
- **Evidence:** `MAX_TEMPLATE_PAGES` in `pages.ts`.
- **Fix:** owner decision (section 10).

### 17. No monitoring (Medium, S)
- **Problem:** errors go to the console only. A failed build or failed lead email is seen by nobody.
- **Evidence:** 51 `console.*` calls, no error service.
- **Fix:** alert the owner by email on a failed build or failed lead email. An error service can wait.
- **Test:** force a failure and see the alert.

### 18. Database warnings to review (Medium, S)
- **Problem:** nine functions that run with elevated rights can be called by any signed-in user. Leaked-password protection is off.
- **Evidence:** Supabase security advisor, 15 November. No errors. Four "no policy" notes are intended (server-only tables).
- **Fix:** confirm each function checks the caller. Turn on leaked-password protection in the Supabase dashboard.
- **Test:** the database tests in `supabase/tests`, rerun.

### 19. Two generation pipelines (Medium, M)
- **Problem:** the older free-form pipeline (plan, then page wording) has retries and the ceiling but none of the content checks.
- **Evidence:** `src/lib/ai/website-pipeline.ts`; `docs/LAUNCH_CHECKLIST.md` line 57.
- **Fix:** owner decision: retire it for now, or bring it under the same checks.

### 20. Housekeeping (Low, S)
- **Problem:** stray files are committed (`dev4.log`, `dev5.log`, a folder called `undefined`), the package is still named `fydevs`, `globals.css` is 14,801 lines, and `docs/TESTING.md` says payments aren't built.
- **Fix:** delete, rename, update. Leave the stylesheet alone unless it causes a problem.

## 4. Critical security and backend concerns

- **No errors from the security advisor.** Row-level security is on for all 62 tables.
- **Leads not stored** (finding 3). This is the most serious backend gap.
- **Nine elevated functions callable by signed-in users** (finding 18). Likely intended, not yet confirmed one by one.
- **Inline scripts are allowed by the content policy** (`next.config.ts`). Text is escaped by React and the renderer blocks unsafe image addresses, so the risk is low today.
- **SVG uploads are accepted.** They are stored privately and never shown on a site. If finding 6 is built, SVG logos must be converted or shown only as images.
- **No CI and no monitoring** (findings 9 and 17).

## 5. Visual design weaknesses

- One layout skeleton with three arrangements. Section order within a layout never changes.
- System fonts only (finding 10).
- Identical fixed wording per sector (finding 4).
- No logo (finding 6).
- No use of the customer's own answers as visual content: the "what makes you different" answer only feeds the intro and the About page.
- The About page is a paragraph and a few cards. The FAQs page is a list. Inner pages are thin.
- Photos are cropped to fixed shapes with no control over the focal point, so faces can be cut off.
- The four looks differ mostly in corner radius and heading weight.

## 6. Missing functionality and QA coverage

- Publishing, domains, real page addresses (finding 1).
- Stored leads and a place for the customer to see them (finding 3).
- Browser tests, accessibility tests, performance budgets (finding 8).
- A map, opening-hours "open now", click-to-message: none exist. Only directions and phone links.
- Sector coverage: no template for professional services, retail, restaurants (as distinct from cafés) or personal trainers (as distinct from gyms). A business outside the eleven sectors has no template path.
- Thin or conflicting input is tested for parsing, not for how the page looks.

## 7. Architectural improvements worth making

- One public site route that both preview and live use, with real paths per page.
- An images step (resize, dimensions, focal point) between upload and render.
- Split `SiteRender.tsx` into one file per section before adding more variants.
- A single "build report" record per build: checks, scores and screenshots, so quality has evidence.

## 8. Not worth doing

- A drag-and-drop editor for customers.
- Letting the model write layout, HTML or CSS.
- More than three or four layouts per sector before the three are polished.
- A separate CMS, a component library dependency, or an animation library.
- Splitting `globals.css` for its own sake.
- An error-tracking service before email alerts exist.
- Dozens more sector templates before real customers show which are needed.

## 9. Phased plan

| Phase | What | Effort |
|---|---|---|
| A. Stop losing customers | Findings 2, 3, 6, 13, 15, 20 | About a week |
| B. Prove quality | Findings 8, 9, 12, 11, 17, 18 | About a week |
| C. Go live | Findings 1, 7, 5 | Two to three weeks |
| D. Stop looking templated | Findings 4, 10, 14, inner pages, focal points | Two to three weeks |
| E. Breadth | Findings 16, 19, new sectors | After real customers |

The 95 target should be scored after phase D, from the phase B evidence, not before.

## 10. Decisions needed from the owner

1. **Hosting:** each customer on their own domain through Vercel, or on a WINJO subdomain first? This decides the shape of finding 1.
2. **Order:** is phase A then B then C right, or should going live (C) come before proving quality (B)?
3. **Wording freedom (finding 4):** may the model write section headings and the closing line, under the same checks?
4. **Fonts (finding 10):** approve adding self-hosted fonts (no new code dependency, some page weight).
5. **Pages (finding 16):** cap Plus and Pro at the pages templates can build, or build more page types?
6. **Free-form pipeline (finding 19):** retire for now, or bring under the checks?
7. **Leads table (finding 3):** approve a new database table. I'll give copy-paste SQL.
8. **CI (finding 9):** approve a GitHub Action in the repo.
9. **Leaked-password protection:** turn on in the Supabase dashboard (your action).
10. **Benchmark sectors:** which of professional services, retail, restaurants and personal trainers to add first.

## Status after phase A (15 November 2026)

| Finding | Status |
|---|---|
| 2. Form confirmation on multi-page sites | Done. The form posts its page, and the visitor returns to it. Tested. |
| 3. Leads saved | Done in code. Needs the table: run `docs/site_enquiries.sql` in Supabase (copied to the migration folder too). No screen for the owner to read leads yet. |
| 6. Logo shown | Done. Header shows the logo with the name as its text. Vector logos are accepted as images only. |
| 13. Pale colours | Done. Colours must reach 4.5:1 on the site's paper. Every swatch passes. |
| 15. Plans and pages | Partly. A Gallery page now needs three photos. The FAQs-on-Essential conflict isn't fixed: the form doesn't know the plan yet. |
| 20. Housekeeping | Done: stray logs and the `undefined` folder removed, testing notes corrected. The package name `fydevs` is left alone: renaming it changes the lock file and nothing customer-facing. |

Not done, and not started: phases B to E.

## Status after phase B (15 November 2026)

| Finding | Status |
|---|---|
| 9. Automatic checks | Done. `.github/workflows/ci.yml` runs types, lint and tests on every push and pull request. The same three commands pass locally. Not yet seen running on GitHub: it runs when the branch is pushed. |
| 12. Quality results | Partly. The test panel shows how many staff ratings each template has, and the share rated good. No release rule (for example 8 in 10) is set yet; that needs the owner's number. |
| 18. Database functions | Reviewed. All nine functions that run with elevated rights check who is calling. The quote and approval functions also check the caller's organisation. No defects found. Leaked-password protection is still off: the owner turns it on in the Supabase dashboard. |
| 8. Browser tests | Not started. Needs a decision: add the Playwright test package as a dev dependency. |
| 11. Checks on real output | Not started. Needs a real Haiku run with the key in Vercel. |
| 17. Alerts | Not started. Failed lead emails are logged only. |
