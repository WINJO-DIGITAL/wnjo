# Template build: progress tracker

Objective: a customer pays, ticks and types their answers, an AI fills a sector template, the owner reviews the preview, revisions follow, then it goes to the customer. Spec: `AI_BUILD_SPEC.md`. Inventory: `TEMPLATE_INVENTORY.md`.

Working rules: commit locally; push or merge only when the owner says "push" or "merge to main" (each push builds on Vercel). Nothing sends real emails or spends real money without the owner.

## Done (local commits; nothing pushed yet)

- Content schema, Barber preset, automatic checks (`src/lib/site-template/schema.ts`, `presets.ts`, `checks.ts`).
- Renderer for the Barber template, four looks, safe by construction (`src/components/site-template/SiteRender.tsx`), and a sample build that passes every check (`sample.ts`).
- Writing step: facts are assembled from the customer's answers, the model writes wording only, one retry with the check reasons, spend cap respected (`write.ts`).
- Customer answers: parse and validate (`answers.ts`), stored on the versioned brief as `brief.site`, shown in the brief text and email.
- Build step and store (`build.ts`, `build-store.ts`); staff service with release (override needed for failed checks) and withdraw (`build-service.ts`); route actions `site`, `site-release`, `site-withdraw`, `site-link` on `/api/admin/ai/website`.
- Private preview page `/site-preview/[token]`; the customer's "View your preview" link picks the newest released build or preview.
- Staff panel: template builds listed with view, release, withdraw and "write it again" with a change note.
- Automatic first draft: a paid brief with complete sector answers gets a template build (once), instead of a plan and copy preview.
- Customer form: sector choice, services and prices, opening hours grid (no pre-filled times), contact, tick-box facts, look and colour, in the post-payment details form (`SiteFields.tsx`).
- Photos: uploaded images become the hero and gallery, shown through short-lived signed links (`photos.ts`).
- Claude provider through the official SDK (`src/lib/ai/anthropic.ts`), chosen with `AI_PROVIDER=anthropic` (Grok stays the default). Settings: `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `ANTHROPIC_INPUT_PENCE_PER_MILLION_TOKENS`, `ANTHROPIC_OUTPUT_PENCE_PER_MILLION_TOKENS`, optional `ANTHROPIC_EFFORT` and `ANTHROPIC_MAX_TOKENS`. Prices are pence per million tokens (convert from dollars). Not yet run against the live service.
- The customer's sector questions are hidden until `NEXT_PUBLIC_TEMPLATE_SITES=on` is set in Vercel, so a push cannot expose them.
- Migration `supabase/migrations/20261112090000_website_site_builds.sql`: applied and checked in the live database (12 Nov).
- Merged to main (12 Nov, `5fa1f64`). `NEXT_PUBLIC_TEMPLATE_SITES=on` is set in Vercel and redeployed, so customers can see the sector questions.
- Booking-request endpoint `/api/site-enquiry` (12 Nov): the form posts natively, works without JavaScript, only a released build takes requests, the email goes to the website owner's verified account address (never one from the request), rate limited, with a hidden bot trap and a confirmation or error shown on the page. Draft previews stay inactive.
- Café and Electrician presets (12 Nov): each with a sample build that passes every check. Café: menu and table requests. Electrician: areas covered (each must appear), optional hours, quote requests, a Call button. Preset-specific labels for the request box.
- Page limit on the details form (12 Nov bug fix): Core 5, Plus 10, Pro 20 pages (or what a one-off buyer paid for). The server gives the allowance (`/api/briefs/allowance`) and refuses more pages when the details are saved; the form disables extra pages at the limit.
- Business types (12 Nov): three groups (Booking services, Hospitality, Trades), each with its templates. "Another type of business" has a typed box, stored on the brief as `otherBusinessType` for planning by hand. Only Barber, Café and Electrician build automatically.
- Upload list on the details form: thumbnails for files picked this session, a View link (owner-only, 60-second signed link via `/api/briefs/file`), one row per file with wrapping names.

## Blocked on the owner

- An AI key in Vercel for any live build: `XAI_*` for Grok, or `AI_PROVIDER=anthropic` with the `ANTHROPIC_*` settings.

## Next

1. Model comparison on ten builds (Grok against Claude Haiku). Needs an AI key.
2. Customer-facing wording about the process, only after a real end-to-end test with a live model.
3. More sectors (physio is in the site styler already), each with a sample build that passes every check.

## Known gaps and risks

- Never run against a live model: reply shape unverified (also true of the existing Grok step).
- The sector questions are only in the post-payment form, not the checkout steps.
- The new tables and policies have no database-level tests (the migration is unapplied).
- Hours-in-prose are not checked (the prompt tells the model not to quote times).
- Boonma repo not yet inventoried (needs its name).
- Customer hosting on their own domain is not designed.

## Tests

`npx vitest run` passes (see the latest run in the commit log). Typecheck and lint clean.
