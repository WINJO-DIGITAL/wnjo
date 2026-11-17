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

## Athletic pilot, third round (17 Nov)

- Hours and find us share one band beside each other on wide screens (merged to main, `e045283`).
- Header: logo left, menu beside it, buttons right. The centred logo used to clip the menu ("Find us" was cut off on every desktop render).
- Checked: desktop and phone, the three hero layouts (showcase, split, essentials).
- Measured (17 Nov, local production build, barber sample, Athletic): Lighthouse desktop 100 / 100 / 100 / 100 (performance, accessibility, best practices, SEO); mobile performance 82-83, the other three 100. axe: no violations on all eight styles at 1280 and 390 px.
- Mobile performance cause: largest paint 4.6 s in Lighthouse's throttled-mobile run, although the hero image itself loads in about 0.2 s. The wait is render-blocking CSS (about 70 KB, every style's rules ship to every site) and a 91 KB font. Real fix, not done: ship only the chosen style's CSS. Adding `fetchpriority="high"` to the hero image made no measurable difference; kept as harmless.
- Score stays 74. Technical, responsive and accessibility are now measured and strong; the remaining gap is imagery and per-style motion.

## Fourth round, all styles (17 Nov, local; not pushed)

Done for every style: opening motion (transform only, own movement per style, off under reduced motion); photographic grade (a light CSS tone per style, files untouched); twelve theme colours instead of six, every one passing axe contrast in all eight styles with and without photos (96 combinations). No-photo heroes now draw a graphic: Athletic speed lines, Precision drafting grid, Clinic arches (the other five already had framed or banded compositions). Athletic header and hours/find-us band fixed. A phone overflow on Tradesman (long figure word, for example "Emergency") fixed: four plumbing browser tests were failing on main before this and now pass.

Measured: all 90 browser tests, 1,510 unit tests, axe clean on all eight styles at 1280 and 390 px (with and without photos), Lighthouse desktop 99-100, mobile 82 (observed largest paint 218 ms; the 4.5 s is Lighthouse's throttled simulation, and the stylesheet is 49 KB compressed, so splitting it per style would not change it; decided against).

| Style | Score | Basis |
| --- | --- | --- |
| Athletic | 78 | Merged band, header fix, speed-line hero, motion, grade |
| Boutique | 76 | Motion, grade, colours |
| Precision | 77 | Drafting-grid hero, motion, grade, colours |
| Executive | 75 | Motion, grade, colours |
| Hearth | 75 | Motion, grade, colours |
| Heritage | 75 | Motion, grade, colours |
| Tradesman | 75 | Overflow fix, motion, grade, colours |
| Clinic | 73 | Arch hero, motion, grade, colours |

Scores are still my judgement. What stops 90 now: art direction needs the owner's own photographs (the stand-in photo is one barber shot in every style), and a second typeface per style is not done.

## Fifth round (17 Nov): second typefaces and graphics for every no-photo hero

Athletic now sets text in Inter under its Archivo headings, Executive in Hanken Grotesk under Jost, Tradesman in DM Sans under Archivo, Clinic in Nunito under Figtree (all faces already in the build, so no new downloads). The other five no-photo heroes draw their own graphic: Boutique soft curves, Executive gold corner brackets, Hearth a woven check, Heritage a brass sunburst, Tradesman hazard chevrons. Every style now has a graphic, motion, a photo grade, a second typeface and twelve colours. Verified again: 90 browser tests, 1,510 unit tests, axe clean (photo and no photo, desktop and phone), 96 colour combinations pass contrast.

Rescored: Athletic 79, Precision 78, Boutique 77, Executive 76, Hearth 76, Heritage 76, Tradesman 76, Clinic 75. Still judgement. The remaining gap to 90 is the owner's own photography per business and per-sector imagery; nothing left in this list can be closed with code alone.

## Sixth round (17 Nov): lessons from the four portfolio sites

From RAENG Fitness, Boonma and EV Exec (read-only; Duratek had nothing new). Done, all eight styles:

- **Scroll reveal** (RAENG's pattern): parts of a section below the fold ease up into place as they arrive, with each style's own distance, speed and easing. Movement only, never opacity, so text is always fully opaque. An inline script marks the parts, so with no JavaScript or with reduced motion nothing is ever hidden.
- **Request in steps** (Boonma's wizard, kept simple): two steps (what you need, your details) with a progress line, each step checked before the next, focus moved to the new step, Back, and a swipe on phones. The form is still one ordinary posting form: without JavaScript every field shows and it works as before.
- **Hero footage** (RAENG `HeroVideo`): silent looping video over the hero photo, visible pause button, still photo for reduced motion or if it can't load. Photo-first layout only. The page and renderer support it, and the fitness sample uses RAENG's own class footage. **Customers cannot supply footage yet**: there is no video upload, storage or limits, so for real sites it stays unused until that is built.
- **Real photos for two sample sectors:** Boonma's treatment-room photos for massage, RAENG's training photos for fitness (owner confirmed 17 Nov). Rooms without people were chosen for massage.

Not used: EV Exec's car images (look AI-generated, one is a portrait of a named person; provenance unconfirmed). Boonma's one-data-file idea (prices, FAQ, SEO pages and structured data from one file) and its 19 generated local-SEO pages are the next reusability and technical lever; EV Exec's fares, fleet and quote pages are the taxi content still to build.

Verified: 93 browser tests (three new), 1,514 unit tests, axe clean (photo and no photo, desktop and phone), Lighthouse accessibility, best practices and SEO at 100 on the new massage and fitness samples, mobile performance 82-85.

Rescored: Athletic 80, Precision 79, Boutique 78, Executive 77, Hearth 77, Heritage 77, Tradesman 77, Clinic 76. Judgement, as before.

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
