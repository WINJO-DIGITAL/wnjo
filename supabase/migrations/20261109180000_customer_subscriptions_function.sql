-- Customers read their own plans through a function that returns only the fields the account shows, matched on their
-- sign-in email. Direct table reads for customers are removed. Staff access is unchanged.
drop policy if exists "customers read own website subscriptions" on public.website_subscriptions;
drop policy if exists "customers read own subscription payments" on public.website_subscription_payments;

create or replace function public.my_subscriptions()
returns table (
  id uuid,
  reference text,
  enquiry_reference text,
  kind text,
  status text,
  package_name text,
  monthly_pence integer,
  one_off_pence integer,
  payments_count integer,
  ownership_after_payments integer,
  ownership_eligible_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select s.id, s.reference, s.enquiry_reference, s.kind, s.status, s.package_name, s.monthly_pence, s.one_off_pence,
         s.payments_count, s.ownership_after_payments, s.ownership_eligible_at
  from public.website_subscriptions s
  where lower(s.email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
  order by s.created_at desc
$$;

revoke all on function public.my_subscriptions() from public, anon;
grant execute on function public.my_subscriptions() to authenticated;
