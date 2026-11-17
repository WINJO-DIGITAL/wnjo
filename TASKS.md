# Master templates: tracker

The eight styles live in `src/lib/site-template/styles.ts` and are drawn by `src/components/site-template/SiteRender.tsx` and `SiteRender.module.css` (one `data-look` block each). Scored on the agreed weights: art direction 30, layout 15, typography 10, UX 10, reusability 15, responsive 10, technical 10. Scores are honest; 90 is the target, not the current state.

## Baseline (17 Nov 2026, before the structural passes)

| Style | Score | Main weakness at baseline |
| --- | --- | --- |
| Athletic | 71 | Good RAENG structure; imagery generic, sections still follow the shared order |
| Precision | 70 | Strong navy/sand system; service panel and gallery slices repeat the same card idea |
| Boutique | 69 | Waves work; hero and menu good, lower half is plain panels |
| Executive | 68 | Hero card is distinctive, rest is a standard stack (not re-rendered in this audit) |
| Hearth | 66 | Warm but flat: no signature structure |
| Heritage | 64 | Dark and brass colouring only |
| Tradesman | 64 | Stripe and yellow bars only |
| Clinic | 55 | Flat sage panels, small cards under a photo, no identity beyond colour |

## Current (after passes)

| Style | Score | Done |
| --- | --- | --- |
| Hearth | 71 | Framed plate hero, menu board, chalkboard hours, warm request card |
| Heritage | 71 | Brass plaques, framed price board, poster hero |
| Tradesman | 70 | Job-sheet cards with yellow offsets, figures band, navy hours, yellow call slab |
| Athletic | 74 | Scaled-up type, services as full-width rows with hairlines, oversized figures band on ink |
| Precision, Boutique, Executive | as baseline | Earlier structural work only |
| Clinic | 63 | Arch photo beside the words, treatments as a heading-left list-right split with hairlines, figures without cards, sage closing band |

## The systemic weakness (Part 10)

Every style still renders the same sequence: hero, gallery or menu, hours, find us, request form, questions. Different skins, same skeleton. Two fixes are planned at system level rather than per style:

1. DONE: each style has its own home-page section order (`src/lib/site-template/flow.ts`, tested). Hero stays first; the request, questions and closing band stay last; hours and find us stay paired. Still to do: merging sections (for example hours beside the form).
2. Give the shared taxi-type content real structure: fares table (clearly marked sample prices on sample pages only), how-to-book strip, vehicle and capacity block, no duplicate logo, a different closing band per style.

## Known issues

- Nav-overlap checker flags a very long business name at 1024 to 1100px on Tradesman; checked by eye, the name sits on its own row, so it is a false positive.
- `/e2e-site?t=general` is not a valid sample, so Executive needs the scratch route to render.
- Imagery is customer, own or licensed only (no paid generation), so no-photo sites rely on type, bands and figures.

## Per-pass checks

Render on desktop and phone, contrast across six colour swatches, stress at five widths, nav overlap, typecheck, lint, full tests, then owner review. Nothing is pushed until the owner says so.

## Next

Precision, Boutique, Executive, then the system-level changes above.
