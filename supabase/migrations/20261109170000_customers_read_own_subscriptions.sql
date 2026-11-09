-- Customers can read their own website subscriptions and payments, matched on their sign-in email, so the account
-- can show the plan and ownership progress. Staff access is unchanged. Nothing here allows a customer to write.
create policy "customers read own website subscriptions" on public.website_subscriptions for select
  using (lower(email) = lower(coalesce((select auth.jwt() ->> 'email'), '')));

create policy "customers read own subscription payments" on public.website_subscription_payments for select
  using (subscription_id in (
    select id from public.website_subscriptions where lower(email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
  ));
