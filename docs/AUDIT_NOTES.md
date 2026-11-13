# Website audit notes (14 November 2026)

Audit of the live site (`winjodigital.co.uk`, production at `c35e280`). Nothing in this file is done yet. Work
through the fixes below one at a time, one commit each, and tick them off here as they land.

## What's already good (no change needed)
- All 16 public pages return 200 with one H1, a canonical address, and no console errors.
- All 35 internal links work.
- Every private API route refuses calls without a login. The Stripe webhook rejects unsigned requests.
- No known package vulnerabilities (`npm audit --omit=dev`). No secrets committed to the repo.
- Security headers present: HSTS, CSP, frame deny, nosniff, referrer and permissions policies.
- Homepage on a phone (Lighthouse): SEO 100, accessibility 100, best practices 100. Performance 79.

## Fix first: wrong or stale wording
- [ ] Refresh is "Included in Plus and Pro" on `src/app/pricing/page.tsx` (~line 108), `src/app/page.tsx` (~127) and `src/app/managed-websites/page.tsx` (~96). It's now on every plan. Change the wording to match.
- [ ] `src/app/work/page.tsx` (~line 25) says "Three client businesses". There are four (Duratek added).
- [ ] Homepage work strip (`src/app/page.tsx`, `work` array) shows four sites, with Duratek missing from the hero list. Check the strip matches the work page.

## Buying a website outright: remove the hoops
- [ ] Hero "Get my proposal" on `/website-projects` skips the tier cards. Point it to the "Choose your website" section instead.
- [ ] Hosting step: Continue is blocked until a hosting choice is made. "I'll host it myself" is a small button under the cards. Make it a proper card.
- [ ] Details form (`src/components/configurator/ProjectRequest.tsx`) doesn't show the chosen tier or hosting. Show both.
- [ ] Biggest drop-off: after the details form, the customer must open an email and sign in before the six steps. Consider letting them start the questions straight away.

## Visual
- [ ] `/website-projects`: tier cards are text only. Add a real example site to each tier, to sell visually.
- [ ] Homepage "One less thing to worry about": the right half is empty beside the list.

## SEO and AEO
- [ ] `/faq`: no FAQPage structured data. Add it, since AI answer engines use it most.
- [ ] Plans and tiers: not marked up as offers with prices. Add Offer structured data (see `src/lib/structured-data.ts`).
- [ ] No `llms.txt`. Add a short summary file for AI tools at `public/llms.txt`.
- [ ] `/sitemap.xml` lists `/build`, which redirects. Remove it from `src/lib/routes.ts`.
- [ ] Page titles are generic on some pages ("Website projects", "Questions"). Use buyer wording, e.g. "Bespoke website design from £999".
- [ ] Speed: performance 79 on a phone. The largest image takes 3.5 seconds to appear. Check the hero image size and loading priority.

## Not covered by this audit
- Live forms and payments (the site now takes real money). Not submitted.
- Signed-in account and admin screens (need a login).
- The database's own security advisor (the database connection was down during the audit).

## Known wording to check (from the terms)
- `content/legal/terms.md` 4.6 says "within 1 working day on Plus and Pro". Confirm this still matches the current reply times in `src/lib/pricing.ts` (`replyWorkingDays`).
