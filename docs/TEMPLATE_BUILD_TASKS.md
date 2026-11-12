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
- Upload list on the details form: thumbnails for files picked this session, a View link (owner-only, 60-second signed link via `/api/briefs/file`), one row per file with wrapping names.

## Blocked on the owner

- An AI key in Vercel for any live build: `XAI_*` for Grok, or `AI_PROVIDER=anthropic` with the `ANTHROPIC_*` settings.

## Next

1. Endpoint (the questions are live, so do this before releasing any template site) for the template's booking-request form (emails the business owner), then wire `enquiryAction`.
2. Model comparison on ten builds (Grok against Claude Haiku), once a key is set.
3. Café and Electrician presets (the renderer and checks are reusable).
4. Customer-facing wording about the process, only after a real end-to-end test.

## Known gaps and risks

- Never run against a live model: reply shape unverified (also true of the existing Grok step).
- The sector questions are only in the post-payment form, not the checkout steps.
- The new tables and policies have no database-level tests (the migration is unapplied).
- Hours-in-prose are not checked (the prompt tells the model not to quote times).
- Boonma repo not yet inventoried (needs its name).
- Customer hosting on their own domain is not designed.

## Tests

`npx vitest run` passes (see the latest run in the commit log). Typecheck and lint clean.
