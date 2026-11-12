# Template build: progress tracker

Objective: a customer pays, ticks and types their answers, an AI fills a sector template, the owner reviews the preview, revisions follow, then it goes to the customer. Spec: `AI_BUILD_SPEC.md`. Inventory: `TEMPLATE_INVENTORY.md`.

Working rules: commit locally; push or merge only when the owner says "push" or "merge to main" (each push builds on Vercel). Nothing sends real emails or spends real money without the owner.

## Done (local commits, not yet pushed unless noted)

- Content schema, Barber preset, automatic checks (`src/lib/site-template/schema.ts`, `presets.ts`, `checks.ts`).
- Renderer for the Barber template, four looks, safe by construction (`src/components/site-template/SiteRender.tsx`), and a sample build that passes every check (`sample.ts`).
- Writing step: facts are assembled from the customer's answers, the model writes wording only, one retry with the check reasons, spend cap respected (`write.ts`).

## Next

1. Map a customer's brief to `CustomerFacts` (needs the sector questions).
2. Store a template build and show it to the owner in the admin as a preview, with approve and revision note.
3. Sector question form (tick boxes, services and prices, hours grid, contact, uploads).
4. Endpoint for the template's booking-request form.
5. Anthropic (Claude) provider, then a model comparison on ten builds.
6. Café and Electrician presets.

## Known gaps and risks

- Never run against a live model: reply shape unverified (also true of the existing Grok step).
- Hours-in-prose are not checked (the prompt tells the model not to quote times).
- Boonma repo not yet inventoried (needs its name).
- Customer hosting on their own domain is not designed.

## Tests

`npx vitest run` passes (see the latest run in the commit log). Typecheck and lint clean.
