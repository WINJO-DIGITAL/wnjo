# Website audit notes (14 November 2026)

Audit of the live site (`winjodigital.co.uk`, production at `c35e280`). Ticked items are done (commits `dc51777`, `54b2857` and the SEO commit after them). Work through the rest one at a time,
one commit each, and tick them off here as they land.

## What's already good (no change needed)
- All 16 public pages return 200 with one H1, a canonical address, and no console errors.
- All 35 internal links work.
- Every private API route refuses calls without a login. The Stripe webhook rejects unsigned requests.
- No known package vulnerabilities (`npm audit --omit=dev`). No secrets committed to the repo.
- Security headers present: HSTS, CSP, frame deny, nosniff, referrer and permissions policies.
- Homepage on a phone (Lighthouse): SEO 100, accessibility 100, best practices 100. Performance 79.

## Fix first: wrong or stale wording
- [x] Refresh is "Included in Plus and Pro" on `src/app/pricing/page.tsx` (~line 108), `src/app/page.tsx` (~127) and `src/app/managed-websites/page.tsx` (~96). It's now on every plan. Change the wording to match.
- [x] `src/app/work/page.tsx` (~line 25) says "Three client businesses". There are four (Duratek added).
- [x] Homepage work strip (`src/app/page.tsx`, `work` array) shows four sites, with Duratek missing from the hero list. Check the strip matches the work page.

## Buying a website outright: remove the hoops
- [x] Hero "Get my proposal" on `/website-projects` skips the tier cards. Point it to the "Choose your website" section instead.
- [x] Hosting step: Continue is blocked until a hosting choice is made. "I'll host it myself" is a small button under the cards. Make it a proper card.
- [x] Details form (`src/components/configurator/ProjectRequest.tsx`) doesn't show the chosen tier or hosting. Show both.
- [x] Biggest drop-off: after the details form, the customer must open an email and sign in before the six steps. Consider letting them start the questions straight away. Plan written: `docs/PLAN_BRIEF_BEFORE_SIGNIN.md` (awaiting the owner's go-ahead).

## Visual
- [x] `/website-projects`: tier cards are text only. Add a real example site to each tier, to sell visually.
- [x] Homepage "One less thing to worry about": the right half is empty beside the list.

## SEO and AEO
- [x] `/faq`: no FAQPage structured data. Add it, since AI answer engines use it most.
- [x] Plans and tiers: not marked up as offers with prices. Add Offer structured data (see `src/lib/structured-data.ts`).
- [x] No `llms.txt`. Done as a generated route (`src/app/llms.txt/route.ts`), built from the price list so it stays in step.
- [x] `/sitemap.xml` lists `/build`, which redirects. Remove it from `src/lib/routes.ts`.
- [x] Page titles are generic on some pages ("Website projects", "Questions"). Use buyer wording, e.g. "Bespoke website design from £999".
- [x] Speed (partly): on a normal connection the main image appears in about 1.5 seconds and weighs 13 KB. The slow Lighthouse score comes mostly from JavaScript work (blocking time 480 ms). The phone hero image is now preloaded. Cutting JavaScript is a bigger job, not done.
  (original note) Speed: performance 79 on a phone. The largest image takes 3.5 seconds to appear. Check the hero image size and loading priority.

## Not covered by this audit
- Live forms and payments (the site now takes real money). Not submitted.
- Signed-in account and admin screens (need a login).
- The database's own security advisor (the database connection was down during the audit).

## Known wording to check (from the terms)
- `content/legal/terms.md` 4.6 says "within 1 working day on Plus and Pro". Confirm this still matches the current reply times in `src/lib/pricing.ts` (`replyWorkingDays`).
