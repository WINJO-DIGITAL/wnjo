# AI-assisted website build: spec

Status: draft for the owner to review. Nothing here is live. The customer-facing site makes no AI claims until this is built and tested.

## Goal

A customer pays for a managed website, answers a short set of questions, and gets a bespoke-looking preview that the owner reviews before it goes to them. The owner can ask for revisions, and the customer can ask for changes after that. The whole thing should be cheap to run, quick, and good enough that customers don't complain.

## Principles

1. **Templates, not generated code.** The owner designs a small set of sector templates once. The AI fills them in. It never writes a site from scratch.
2. **Structure first.** The customer's answers are structured (tick boxes, short fixed options). Free text is only used where no tick box can capture the answer.
3. **Checks, not trust.** Automatic checks decide whether a build is usable. The AI is never asked whether it is "happy" with its own work.
4. **A person releases everything.** Nothing reaches a customer until the owner approves it. The existing approval step stays as it is.
5. **Hard spending limits.** Each website has a cap, already enforced, and the AI calls are kept small.

## The flow

This is the owner's flow, confirmed 17 November 2026, and what the code does.

1. **Customer pays their plan first.** A plan button opens the short checkout (name, business, email), then Stripe. Nothing else is asked before payment. The build moves to "AI processing".
2. **Customer fills in their goals in their account.** Goals, pages, look, business details and uploads. Sending them saves the brief and starts step 3 at once.
3. **The system picks it up automatically.** Sending the goals (`POST /api/briefs/details`) starts the draft straight away, after the reply. The daily sweep and the payment webhook run the same code for anything missed, so nothing waits on a person.
4. **The AI plans the website** from the goals: pages, sections, tone.
5. **The AI picks the template** that fits the plan: one of eleven sectors in one of four looks, 44 in all. A sector the customer ticked is never overruled, and a look they chose is kept. For a customer who typed their own kind of business, the AI picks from the sectors that can be built from their answers without inventing anything (opening hours are never guessed). If none can, a text-only draft is made instead.
6. **The AI builds the site and the checks run.** The checks are the list under "Checks". A reply outside the allowed lists gets one retry; a build that fails is tried once more, then left for the owner.
7. **The owner is emailed** that it is ready for review ("Ready for your review"), or that it needs a look because checks failed, or that it could not be built. Nothing has reached the customer.
8. **The owner reviews in Admin, Website builds.** They approve it, or write a change note and the AI rewrites it. They can go back and forth with the AI as often as needed.
9. **The owner releases it to the customer.** Only then does the customer see it, and they are emailed.
10. **The customer reviews it** in their account: approve the preview, or ask for changes. Each request is a numbered revision that goes back to the owner at step 8.
11. **Owner approves, site goes live.** The four approvals (quality, pricing, contract, publication) are unchanged.

Two things are deliberately different from this flow and unchanged: a bespoke build that needs a written quote still goes brief, then proposal, then deposit, because the price isn't known until it is written; and the AI never moves a build past "Website generation" or publishes anything.

## Build mode: AI drafts, or the owner builds

A switch in Admin, Website builds (owners and admins only) sets how new websites are made. It is stored per agency in `tenant_settings.website_build_mode`.

- **The AI builds a draft (auto).** The flow above, as it is.
- **I build them myself (manual).** Nothing is built automatically: the payment webhook, the goals form and the daily sweep all leave the website alone. The owner is told when a customer signs up (the "New ... subscription" alert) and when they send their goals. The goals email is then the whole brief, ready to paste into a CLAUDE.md (`src/lib/website-handoff.ts`). The same brief, with working download links for the customer's files, is behind **Copy brief for Claude** on the website's Brief tab. The AI is still available by hand on any website (Regenerate), so the owner can use it for a first draft.
- Switching back to automatic means the next sweep drafts any paid website that has its goals and no draft yet.
- A website built by hand is released to the customer the same way as any other: the owner uses Admin to move it on, and the four approvals before going live are unchanged.

## Templates

A website is one of **eight styles**, and the words inside are the customer's own. The style is the design; the business is the content. Any business can wear any style.

| Style | From | Feel |
| --- | --- | --- |
| Athletic | RAENG Fitness | black and white, wide heavy type, split arrow button, hairline rules |
| Precision | Duratek | navy and green, light large type, a strip of gallery slices that open on hover |
| Boutique | Boonma | cream, a friendly serif, flowing wave edges between sections |
| Executive | EV Exec | charcoal and gold, centred, services as gold-ruled cards |
| Hearth | café sample | warm browns, italic serif, a framed menu board, paper grain |
| Heritage | barber sample | near-black and brass, framed hero, matted photographs, ruled headings |
| Tradesman | electrician sample | white and navy, hazard stripe, cut-edge hero, heavy form fields |
| Clinic | physio sample | sage and green, rounded, soft washes, airy |

- A style is a whole design (type, shapes, the top of the page, lists, facts, form, closing band), not a recolour. They live in `SiteRender.module.css` and are registered in `src/lib/site-template/styles.ts`. The four older looks still draw, so earlier sites keep their look.
- The customer's theme colour works in every style. All eight pass a contrast check (WCAG AA) with every theme colour, with and without photos, and hold at 320 to 1920 px wide with a 60-character name, twelve services and seven pages.
- The AI picks the style from the plan (`choose.ts`). A style the customer chose is kept.
- **Content kits.** Eleven sector kits (barber, café, electrician and so on) carry the questions, tick-boxes and the wording rules for that kind of business. A twelfth, the **general** kit, is for any business that describes itself in its own words (a taxi firm, a florist): hours and areas are optional, the wording is neutral, and it says only what the customer said. It is never offered as a tile. The AI picks a specific sector only when it is plainly the same kind of business.
- A template is only used once it has a sample build that passes every check.

## The questions

The form stays short. Target: under five minutes.

- **Sector:** the template card (required).
- **Goals:** tick boxes, up to three (bookings, more enquiries, showing work, trust, recruiting, and so on).
- **Pages:** tick boxes from a fixed list the template supports, plus "add another" for uncommon ones.
- **Colour theme:** the existing colour tick boxes.
- **Look:** a few tick boxes (clean and minimal, warm and friendly, bold, classic).
- **Services and prices:** a short list, one per line, with an optional price. This is text only because there is no other way to capture it.
- **Opening hours:** a tick-box grid for days, with time fields.
- **Contact:** phone and address (both optional, but at least one contact method is required).
- **Photos and logo:** uploads, optional.
- **Anything else:** one optional text box.

Text fields are only used where a tick box can't do the job. Each field has a length limit.

## Checks

A build passes only if all of these hold:

- Every required section in the template is filled.
- No placeholder text is left (for example "Lorem", "Your headline here", "[business name]").
- Each field is within its length limit and uses only allowed options.
- The business name, and any services and prices the customer gave, appear in the output.
- No prices, contract terms, legal wording or contact details are invented. Anything not supplied by the customer is left out, not made up.
- The output parses against the template schema.

The owner can always override a failed check when reviewing.

## Models

- **Writing step (filling the template):** a small, low-cost model is enough, because the task is short and structured. Haiku-class models are the right choice to test first. Cost target: under 10p per build.
- **Planning and extraction (turning answers into a build job):** can use the same small model. No code is generated, so no larger model is needed.
- **The provider is Claude (Anthropic), Haiku 5.5 by default.** The owner dropped Grok on 14 November 2026. Only `ANTHROPIC_API_KEY` is required. The model, its thinking level and its prices are settings with defaults, so the model can change without rebuilding.
- **Claude Code is not used in the loop.** It isn't needed for template filling, and it would be far more expensive per site.

## Cost

- Hard cap per website, already enforced (default 100p, £1).
- A build should use one planning call and one writing call per section, with a total target of under 10p.
- Revisions re-run the writing step only, not planning.

## Build service

- Runs inside this repo's existing server code and database. No new hosting account.
- Reads only what the build needs: sector, answers, uploads' locations. It never sees payment details or contact details it doesn't need.
- Writes drafts to the database. It never moves a build's stage or publishes anything, the same rule as the current AI pipeline.

## What is built and what is missing

| Part | Status |
| --- | --- |
| Payment, account, goals form, uploads | Built |
| AI plan and page wording as drafts, spend cap | Built (uses Claude; untested against the live service) |
| Owner review and release, customer revisions | Built |
| Sector templates (Barber, Café, Electrician) | Missing |
| Template-driven rendering of a preview | Missing |
| Sector question and tick-box form for the template | Missing |
| Automatic checks listed above | Missing |
| Revision notes re-running the writing step | Partly built (the preview draft stores a change note) |
| Anthropic (Claude) provider | Missing |
| Hosting customer sites on their own domain | Not designed |

## Phases

1. **One template, end to end.** Barber only. Build the template, the form for it, the checks, and the preview. Test with three made-up barbers and one real customer's answers (with permission).
2. **Owner review and revisions.** Connect the admin review and revision loop to the new previews.
3. **Café and Electrician templates.** Add them, using the same process.
4. **Model check.** Run the template test (`src/lib/site-template/eval.test.ts`) against Haiku, and a larger Claude model if the pass rate is low. Compare quality, failures and cost.
5. **Customer-facing copy.** Only once the process has passed a real test, write the public description of how it works.

## Decisions for the owner

- Which sectors first, if not Barber, Café and Electrician.
- Whether the owner always reviews every build, or only the first build for each template.
- Whether a customer can see the template name, or only the finished preview.
- The model: Claude Haiku 5.5 (decided 14 November 2026). Grok was dropped.

## Open risks

- A template can look generic if the owner's design is generic. The owner should review the templates themselves before they're used.
- Customers who fill in very little will get thinner sites. The form should say so, and the checks should stop empty sections from reaching the preview.
- The customer-hosting question has no answer yet. It needs its own decision before the first customer goes live.
