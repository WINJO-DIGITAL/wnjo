-- Hosting on its own (/build/hosting) is sold as a rolling monthly subscription. Its package codes join the existing
-- ones, so a hosting plan can be stored, paid for through Stripe and shown in the customer's account.
-- Until this runs, the hosting page still records the request and tells the customer a payment link will follow.
alter table public.website_subscriptions
  drop constraint if exists website_subscriptions_package_code_check;
alter table public.website_subscriptions
  add constraint website_subscriptions_package_code_check
  check (package_code in ('bronze', 'silver', 'gold', 'one_off', 'hosting', 'care', 'care_plus'));
