# WINJO Digital: checklist to finish the launch

Code state: `main` is at `b57ca2a`. Nothing else needs a code change before launch, except the items marked "Developer".

## 3. Turn on live billing
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

## For the developer (not the owner)
- The `/build` note in the audit was wrong: the bare `/build` redirect to `/pricing#plans` is intended.

Suggested model for the other account: Sonnet 5.5 for items 3, 4 and 7. Fable 5.2 for item 6.
