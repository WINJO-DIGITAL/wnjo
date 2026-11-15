# WINJO Digital: checklist to finish the launch

Code state: `main` is at `8f95133` (header fix, plus the CI typecheck fix in `2caa157`).
Nothing else needs a code change before launch, except the items marked "Developer".

## 1. Check the deploy
- [x] Vercel (winjodigital project): the production deployment for `8f95133` shows Ready. Checked 15 Nov: Ready.
- [x] GitHub Actions: the CI run for `8f95133` is green (both `checks` and `browser` jobs). Checked 15 Nov: green.
- [x] On a phone and a desktop, scroll the home page: the header stays solid, with no text showing through. Checked 15 Nov in a test browser at phone and desktop sizes. Worth one look on a real phone.

## 2. Decide the hosting exit notice (the terms and the pages disagree)
- [x] Decided 15 Nov: any time, no notice, and the plan runs to the end of the paid month. Was: "any time, no notice" (terms section 8.1) or "30 days' notice" (hosting page, pricing page, `llms.txt`, hosting emails).
- [x] Pages and emails changed to match the terms. Was: tell the developer which one. If "any time", the pages and emails change. If "30 days", the terms change. The terms are still marked as draft and have no solicitor review.

## 3. Turn on live billing
- [x] Stripe dashboard, live mode (WINJO Digital account): Settings > Billing > Customer portal. Save a configuration that allows updating the card and viewing invoices. Do not allow cancellation or plan changes, per the terms. Copy its ID (starts `bpc_`). Done 15 Nov: `bpc_1Uc8a4LEEs7hsljuaZley7ru`, set as the live default.
- [ ] Vercel > winjodigital project > Settings > Environment Variables: add `STRIPE_PORTAL_CONFIGURATION_ID` with that ID, for production. Redeploy. Variable added 15 Nov. Live since the 15 Nov production build of `d398ad6`.
- [ ] Done when: "Manage billing" on the account page opens Stripe's billing page for a customer with a subscription. Not yet tested, because no live subscriptions exist.

## 4. Tighten sign-in settings (Supabase, project `oqwkvrhkgmuhrrxfsahx`)
- [ ] Authentication > Attack protection: turn on leaked-password protection.
- [ ] Authentication > URL configuration: remove `wnjoweb.co.uk` and the broad `*-wnjo.vercel.app` patterns, unless still used. Keep `winjodigital.co.uk`, `www`, and the `winjodigital-*.vercel.app` preview pattern.
- [ ] Done when: a sign-in email from a fresh request lands on `/account`.

## 5. Review the database warnings
Checked 15 Nov against the migration files only, not the live database: all seven tables switch row-level security on and have no policies, and only server routes read them. Nine elevated functions are granted to signed-in users (`accept_quote`, `claim_client_invites`, `claim_org_invites`, `decide_approval`, `decline_quote`, `is_org_member`, `is_platform_admin`, `is_tenant_member`, `my_subscriptions`); the rest are revoked. The dashboard sign-off is still to do.
- [ ] Supabase Advisors: confirm these seven tables are meant to have no policies, because they are server-only: `rate_limit_hits`, `site_domains`, `site_enquiries`, `template_test_ratings`, `template_test_runs`, `website_brief_drafts`, `website_brief_progress`.
- [ ] Confirm the nine elevated functions the advisor lists are meant to be callable by signed-in users. The handover says they were reviewed, so this is a sign-off, not a fix.

## 6. Review the signed-in screens on a phone (needs a test customer account and a staff account)
Checked 15 Nov, signed out only, at phone size: `/account` and `/admin` show the sign-in form, `/account/billing` and `/account/settings` ask the visitor to sign in, nothing overflows, and the billing and admin APIs refuse signed-out requests. The signed-in review is still to do.
- [ ] Customer: account page, billing button, cancellation request, brief and details forms, proposal accept.
- [ ] Staff: admin pages (enquiries, quotes, approvals, subscriptions).
- [ ] Write down each problem with a screenshot and send the list to the developer.

## 7. Real-inbox checks
Checked 15 Nov in the Resend log: sign-in emails are being delivered. The email is plain and unbranded (a heading, one line and a "Sign in" link); its template lives in Supabase. The hosting welcome email now says "Cancel any time".
- [ ] Send a sign-in email to a real inbox and check it on a phone.
- [ ] Check the hosting welcome email's exit wording matches the decision in item 2.

## For the developer (not the owner)
- Done 15 Nov, on this branch and not yet live: the five service pages now carry service and price data.
- The `/build` note in the audit was wrong: the bare `/build` redirect to `/pricing#plans` is intended.

Suggested model for the other account: Sonnet 5.5 for items 1, 3, 4 and 7. Fable 5.2 for item 6.
