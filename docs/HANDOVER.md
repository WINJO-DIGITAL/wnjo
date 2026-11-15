# Handover

Read this first in any new session. It holds the working rules and open items that aren't in the code.

## Working rules (from the owner)

- Commit locally. Push or merge to main only when the owner says "push" or "merge to main". If a stop hook asks for a push, decline and give the commit hashes.
- Merge is fast-forward only: push the feature branch to `main` with `git push origin claude/hopeful-rubin-b40vgv:refs/heads/main`, then push the branch itself.
- Keep replies short and plain. Sentence-case labels. Tick checklist items only when confirmed.
- Give copy-paste SQL for any database change. Never run a destructive change without the owner's OK.
- Never put secrets in chat. API keys go in the Vercel dashboard. Do not request credentials for api.anthropic.com.
- Do not add api.supabase.com or api.vercel.com to allowed hosts.
- Recommend the easiest route first. The owner works from a phone.
- The owner is not VAT registered, has no solicitor, and Core stays at £99 a month.
- Design rules are in `CLAUDE.md`. Next.js rules are in `AGENTS.md`.

## Current state

- AI: Anthropic only. Model `claude-haiku-5-5`. Limits: three rounds per site, £1 ceiling per website, word limits headline 8, intro 18, sentence 18.
- Multi-page template sites are built. The customer chooses Home plus up to five pages (Services, About, Gallery, FAQs, Contact), within their plan limit. Core 5, Plus 10, Pro 20. Templates hold six page types, so Plus and Pro build at most six.
- Facts only. The model writes no service descriptions, and it is told never to invent anything. FAQ answers must come from the customer's facts, are capped at six, and may not repeat each other or the intro.
- Photos: the customer marks one main photo and one logo on the files step. The main photo leads, other photos go in the gallery, and the logo is left out.
- Layouts: every template has three home-page layouts. "Photo first" (showcase) for picture-led businesses, "Side by side" (split), and "Details first" (essentials) for information-led ones. Each sector starts on its own (`defaultLayout` in `schema.ts`) and the customer can pick another in the form. The layout only reorders and restyles; it never adds or removes content.
- Stand-in photos for the template test are stock photos from Unsplash (free commercial licence), one set per sector, in `public/styler`. They are for the staff test only, never a customer's site.
- The template test in the staff AI panel has a page-count picker and one tab per page. Re-run it on the live model after these changes.

## Putting a customer's site on its own address (phase C)

A released template site is now served on the customer's own address. How it works: `src/proxy.ts` sends any request to an address that isn't ours to `/sites/<address>/...`, which the Pages Router page `src/pages/sites/[host]/[[...page]].tsx` renders with none of our header, footer or styles. It shows only when all three are true: staff attached the address, the brief is at the **live** stage (the database allows that only after all four approvals), and a build is released.

To put one live:
1. Once only: run `docs/site_domains.sql` in the Supabase SQL editor.
2. In Vercel, Project > Domains: add the customer's address (or a subdomain of ours, such as `hartley.winjodigital.co.uk`) and set its DNS as Vercel shows.
3. In Admin, open the website, find **Live address**, type the address, press **Attach address** (owner or admin only).
4. Approve and move the website to **Live** as usual.

Good to know:
- Our own addresses are `winjodigital.co.uk`, `www`, localhost and `*.vercel.app`. Add more (for example a staging domain) with the `MAIN_HOSTS` setting, comma separated.
- Attach only one of `www` and the bare domain, and set a redirect for the other in Vercel: there is no redirect between them yet, so both would be served.
- Live pages are cached for about a minute, so a change or a withdrawal shows within a couple of minutes.
- Photos on a live site come from `/photo`, resized (hero 1600 px, gallery 900, logo 400) and cached for good. The private preview still uses signed links to the originals.
- The booking form on a live site posts without a token; the address says which site it is. Requests are saved to `site_enquiries` and emailed.
- Our API routes are also reachable on a customer's address (the proxy leaves `/api` alone). They need the same sign-in as on our own address.

## How a site gets its look (phase D)

- **Type:** `src/lib/site-template/fonts.ts` loads four typefaces. Put `siteFontClasses` on an element around a site (the live page, the private preview, the staff panel and the test page all do) and the stylesheet picks the face its look uses. Without it a site falls back to the device's fonts.
- **Wording:** the original wording for a sector is in `presets.ts`; two alternatives per sector are in `copy-variants.ts`. A business gets one of the three from its name. Keep every alternative short, plain and free of claims: a test holds it to the sector's own rules.
- **Photos:** the customer can mark a main photo and a logo, and describe each photo. The description is the picture's alt text.
- **Test addresses** can name a look and no photos: `plumbing-p1-essentials-bold-nophoto.e2e.test`.

## How to run the checks

- `npm run typecheck`, `npm run lint`, `npm test` (unit tests).
- `npm run build` then `npm run e2e` (browser tests; set `PLAYWRIGHT_CHROMIUM_PATH` if needed). See `docs/TESTING.md`.
- Both run in GitHub Actions on every push (`.github/workflows/ci.yml`).
- Browser tests include the live-site path, using made-up `*.e2e.test` addresses such as `barber-p6.e2e.test` (sector, pages, layout).

## Open items

- Remove old `evexec_` helper functions from the `winjo digital` database. Owner needs to confirm the project and count first.
- Template research: study leading sites per sector and refine the three layouts further. Decide which sectors first.
- The layout picker in the customer form has not been checked on a real phone yet.
- Remaining quality step: a rated re-test with a target (for example 8 in 10 rated good), then tune checks on live results.
- Full audit of the AI build with a stronger model, in a fresh session.
- Decide whether to add page types beyond six, so Plus and Pro can build their full page allowance.
