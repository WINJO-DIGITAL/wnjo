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
| Precision | 73 | Figures framed by rules, services panel as heading beside list, areas and hours as ruled rows instead of sand boxes |
| Boutique | 72 | Larger serif headline, figures between gold rules, hours and the place stacked inside their cards |
| Executive | 71 | Services as gold-ruled rows beside the heading (any count sits well), larger figures that scale on phones, areas as a ruled row, larger headline |
| Clinic | 68 | Arch photo beside the words, treatments as a heading-left list-right split with hairlines, figures without cards, sage closing band; second round: the arch returns in the gallery's lead image and the closing band, larger headline, gallery placed before hours, full-width hero |

## The systemic weakness (Part 10)

Every style still renders the same sequence: hero, gallery or menu, hours, find us, request form, questions. Different skins, same skeleton. Two fixes are planned at system level rather than per style:

1. DONE: each style has its own home-page section order (`src/lib/site-template/flow.ts`, tested). Hero stays first; the request, questions and closing band stay last; hours and find us stay paired. Still to do: merging sections (for example hours beside the form).
2. Give the shared taxi-type content real structure: fares table (clearly marked sample prices on sample pages only), how-to-book strip, vehicle and capacity block, no duplicate logo, a different closing band per style.

## Gap to 90

Every style now has its own structure, but none is honestly at 90. What holds the scores down, in order of weight:

1. Art direction (30%): imagery is generic stock or none; there is no custom illustration, motion or photographic treatment per style. Needs the owner's own photos and, for no-photo sites, a considered graphic language per style.
2. Layout (15%): home pages are still one long stack. Merging sections (hours beside the form) and a second hero composition per style would help.
3. Reusability (15%): content-length stress is tested; colour swatches are contrast-checked, but only six swatches and one typeface per style.
4. Interactions: only hover and the FAQ accordion; no deliberate per-style motion.

## Shared engineering done

- Accessibility, all eight styles: two-tone focus ring (white inside, ink outside) that shows on any background, now on selects, buttons and the photo gallery; the scrolling gallery is keyboard-focusable and labelled; reduced-motion switches off every transition and animation.

## Known issues

- Nav-overlap checker flags a very long business name on Tradesman (1024 to 1100px) and Executive (1100 to 1280px); checked by eye, the buttons wrap to a second row and nothing overlaps, so both are false positives.
- `/e2e-site?t=general` is not a valid sample, so Executive needs the scratch route to render.
- Imagery is customer, own or licensed only (no paid generation), so no-photo sites rely on type, bands and figures.

## Per-pass checks

Render on desktop and phone, contrast across six colour swatches, stress at five widths, nav overlap, typecheck, lint, full tests, then owner review. Nothing is pushed until the owner says so.

## Next

the system-level changes above, then a second round on every style (see "Gap to 90").
