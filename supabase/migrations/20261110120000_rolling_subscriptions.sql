-- Managed website subscriptions are now rolling monthly: no minimum term, and ownership of the build does not
-- transfer after a number of payments. 0 in ownership_after_payments means "does not apply". Existing rows keep the
-- terms they were agreed under (12 and 12); only new offers are written with 0.
alter table public.website_subscriptions
  drop constraint if exists website_subscriptions_ownership_after_payments_check;
alter table public.website_subscriptions
  add constraint website_subscriptions_ownership_after_payments_check
  check (ownership_after_payments between 0 and 120);
alter table public.website_subscriptions alter column minimum_term_months set default 0;
alter table public.website_subscriptions alter column ownership_after_payments set default 0;
