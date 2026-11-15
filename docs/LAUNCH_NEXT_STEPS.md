# WINJO Digital: checklist to finish the launch

Code state: `main` is at `b57ca2a`. Nothing else needs a code change before launch, except the items marked "Developer".

## 3. Turn on live billing
- [ ] Done when: "Manage billing" on the account page opens Stripe's billing page for a customer with a subscription. Not yet tested, because no live subscriptions exist.

## 4. Sign-in settings (Supabase)
- [ ] Optional: leaked-password protection needs Supabase's Pro plan (Supabase refused it on the current plan). Sign-in here is by emailed link, with no passwords, so this only matters if passwords are ever added.
- [ ] Check that a fresh sign-in email lands on `/account`. The redirect list is now cleaned up: `wnjoweb.co.uk` and the broad `*-wnjo.vercel.app` patterns are gone (done 16 Nov).

## 6. Review the signed-in screens on a phone (needs a test customer account and a staff account)
- [ ] Customer: account page, billing button, cancellation request, brief and details forms, proposal accept.
- [ ] Staff: admin pages (enquiries, quotes, approvals, subscriptions).
- [ ] Write down each problem with a screenshot and send the list to the developer.

## 7. Real-inbox checks
- [ ] Send a sign-in email to a real inbox and check it on a phone.

## For the developer (not the owner)
- The `/build` note in the audit was wrong: the bare `/build` redirect to `/pricing#plans` is intended.

Suggested model for the other account: Sonnet 5.5 for items 3, 4 and 7. Fable 5.2 for item 6.
