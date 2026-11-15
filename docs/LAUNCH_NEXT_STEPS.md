# WINJO Digital: checklist to finish the launch

Code state: `main` is at `8f95133` (header fix, plus the CI typecheck fix in `2caa157`).
Nothing else needs a code change before launch, except the items marked "Developer".

## 1. Check the deploy
- [ ] Vercel (winjodigital project): the production deployment for `8f95133` shows Ready.
- [ ] GitHub Actions: the CI run for `8f95133` is green (both `checks` and `browser` jobs).
- [ ] On a phone and a desktop, scroll the home page: the header stays solid, with no text showing through.

## 2. Decide the hosting exit notice (the terms and the pages disagree)
- [ ] Decide: "any time, no notice" (terms section 8.1) or "30 days' notice" (hosting page, pricing page, `llms.txt`, hosting emails).
- [ ] Tell the developer which one. If "any time", the pages and emails change. If "30 days", the terms change. The terms are still marked as draft and have no solicitor review.

## 3. Turn on live billing
- [ ] Stripe dashboard, live mode (WINJO Digital account): Settings > Billing > Customer portal. Save a configuration that allows updating the card and viewing invoices. Do not allow cancellation or plan changes, per the terms. Copy its ID (starts `bpc_`).
- [ ] Vercel > winjodigital project > Settings > Environment Variables: add `STRIPE_PORTAL_CONFIGURATION_ID` with that ID, for production. Redeploy.
- [ ] Done when: "Manage billing" on the account page opens Stripe's billing page for a customer with a subscription. Not yet tested, because no live subscriptions exist.

## 4. Tighten sign-in settings (Supabase, project `oqwkvrhkgmuhrrxfsahx`)
- [ ] Authentication > Attack protection: turn on leaked-password protection.
- [ ] Authentication > URL configuration: remove `wnjoweb.co.uk` and the broad `*-wnjo.vercel.app` patterns, unless still used. Keep `winjodigital.co.uk`, `www`, and the `winjodigital-*.vercel.app` preview pattern.
- [ ] Done when: a sign-in email from a fresh request lands on `/account`.

## 5. Review the database warnings
- [ ] Supabase Advisors: confirm these seven tables are meant to have no policies, because they are server-only: `rate_limit_hits`, `site_domains`, `site_enquiries`, `template_test_ratings`, `template_test_runs`, `website_brief_drafts`, `website_brief_progress`.
- [ ] Confirm the nine elevated functions the advisor lists are meant to be callable by signed-in users. The handover says they were reviewed, so this is a sign-off, not a fix.

## 6. Review the signed-in screens on a phone (needs a test customer account and a staff account)
- [ ] Customer: account page, billing button, cancellation request, brief and details forms, proposal accept.
- [ ] Staff: admin pages (enquiries, quotes, approvals, subscriptions).
- [ ] Write down each problem with a screenshot and send the list to the developer.

## 7. Real-inbox checks
- [ ] Send a sign-in email to a real inbox and check it on a phone.
- [ ] Check the hosting welcome email's exit wording matches the decision in item 2.

## For the developer (not the owner)
- Service pages still lack service and price markup.
- The `/build` note in the audit was wrong: the bare `/build` redirect to `/pricing#plans` is intended.

Suggested model for the other account: Sonnet 5.5 for items 1, 3, 4 and 7. Fable 5.2 for item 6.
