# Testing

## Unit tests (run anywhere)
```
npx vitest run
```
Covers pricing parity (more than 10,000 answer combinations), quote records, catalogue mapping, the enquiry route, the AI engine (permissions, budgets, approvals, retries, loop limits, provider errors, run store), event routing, the morning briefing and its scheduling.

## Browser tests (need a built site and a Chromium browser)
```
npm run build
npm run e2e
```
They open the real built site and check what a visitor would meet on generated sites: every sector, on a phone and a desktop, every page reachable from the menu, every link and image, no console errors, no sideways scrolling, the three layouts, the booking buttons and the form's labels, and the phone call-and-book bar. 83 tests, about a minute. Seven of them (`e2e/live.e2e.ts`) open a sample site on its own address: no WINJO header or footer, a real address for every page, titles, descriptions, canonical links and structured data, the sitemap and robots file, 404s for anything that isn't a live site, and the booking form staying on the visitor's address. Further tests check that each look uses its own typeface from our own address (nothing from Google), that the text at the top of a site with no photo is readable in every layout and look (contrast of at least 4.5), and that a site with photos shows its main photo. Chromium maps `*.e2e.test` to this machine. The sample sites come from `src/app/e2e-site/page.tsx`, which exists only when the server starts with `E2E=1` (the test config does that) and is a 404 everywhere else. Set `PLAYWRIGHT_CHROMIUM_PATH` to use an installed browser. They run in GitHub Actions on every push as the `browser` job.

Not covered by them: a real customer's uploaded photos and the photo route against real storage (it has unit tests with fake storage), the live site against the real database and a real domain, a successful form submission (the route has unit tests), accessibility tools such as axe, performance numbers, and signed-in screens.

## Database tests (need the live Supabase project)
Each file in `supabase/tests/` runs in one transaction and ends with a deliberate error that rolls everything back. The output lists PASS or FAIL for every check. Run them in the Supabase SQL editor, or with `psql`, as the database owner.

| File | Checks | Covers |
|---|---|---|
| `isolation.sql` | 19 | Tenant and client isolation |
| `quotes.sql` | 11 | Catalogue isolation, immutable snapshots, one acceptance per version |
| `acceptance.sql` | 12 | Quote acceptance and decline rules |
| `store_quote.sql` | 4 | Atomic quote storage, server-only |
| `messages.sql` | 15 | Internal notes hidden from clients |
| `approvals.sql` | 16 | Approval decisions and revisions |
| `files.sql` | 9 | File metadata access, private bucket |
| `notifications.sql` | 11 | One per recipient, opt-outs, no truncation |
| `project_columns.sql` | 3 | Internal project fields hidden |
| `staff_projects.sql` | 4 | Staff can't move projects or create them from the browser |
| `ai_access.sql` | 6 | AI records are read-only from the browser |

Last full run of each file: before the most recent database changes. Rerun them after any migration.

## Not yet tested
- Signed-in flows in the browser (client account, staff admin). These need a sign-in link.
- Live server writes on the production database (quotes, enquiries, files). The key is configured; a test submission on the preview would confirm it.
- Live payments and webhooks in production (tested in Stripe test mode only, see the launch checklist). The Claude provider needs its key in Vercel to run. GitHub-based deployment isn't set up.
- Accessibility and performance audits of new screens.
