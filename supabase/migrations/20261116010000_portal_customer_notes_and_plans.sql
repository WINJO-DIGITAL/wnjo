-- Portal work, 16 November 2026. Additive only: nothing existing is changed or removed.

-- 1. Internal notes staff keep about a customer. Customers are known by their email across enquiries, website
--    builds and subscriptions, so a note is keyed by that email. Notes are a record: they can be added and read by
--    the agency's staff, never edited or deleted, and never read by a customer.
create table if not exists public.customer_notes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  customer_email text not null check (customer_email = lower(customer_email) and char_length(customer_email) between 3 and 320),
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  created_by uuid not null default auth.uid() references auth.users (id),
  author_email text not null default coalesce(auth.jwt() ->> 'email', ''),
  created_at timestamptz not null default now()
);
create index if not exists customer_notes_tenant_email_idx on public.customer_notes (tenant_id, customer_email, created_at desc);
alter table public.customer_notes enable row level security;
revoke all on public.customer_notes from anon, authenticated;
grant select, insert on public.customer_notes to authenticated;
drop policy if exists "staff read customer notes" on public.customer_notes;
create policy "staff read customer notes" on public.customer_notes for select to authenticated
  using (public.is_tenant_member(tenant_id, array['owner', 'admin', 'staff']));
drop policy if exists "staff add customer notes" on public.customer_notes;
create policy "staff add customer notes" on public.customer_notes for insert to authenticated
  with check (public.is_tenant_member(tenant_id, array['owner', 'admin', 'staff']) and created_by = (select auth.uid()));

-- 2. What a signed-in customer may see about their own plans: the same rows as my_subscriptions(), with the dates
--    the billing page needs (next payment, end date) and the plan code that the included features are looked up by.
create or replace function public.my_plans()
returns table (
  id uuid, reference text, enquiry_reference text, kind text, status text, package_code text, package_name text,
  business_name text, monthly_pence integer, one_off_pence integer, payments_count integer,
  ownership_after_payments integer, ownership_eligible_at timestamptz, first_payment_at timestamptz,
  last_payment_at timestamptz, current_period_end timestamptz, cancel_at_period_end boolean, cancelled_at timestamptz,
  launched_at timestamptz, offer_expires_at timestamptz, created_at timestamptz
)
language sql stable security definer set search_path to 'public'
as $$
  select s.id, s.reference, s.enquiry_reference, s.kind, s.status, s.package_code, s.package_name, s.business_name,
         s.monthly_pence, s.one_off_pence, s.payments_count, s.ownership_after_payments, s.ownership_eligible_at,
         s.first_payment_at, s.last_payment_at, s.current_period_end, s.cancel_at_period_end, s.cancelled_at,
         s.launched_at, s.offer_expires_at, s.created_at
  from public.website_subscriptions s
  where lower(s.email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
  order by s.created_at desc
$$;
revoke execute on function public.my_plans() from public, anon;
grant execute on function public.my_plans() to authenticated;

-- 3. A signed-in customer's own payment history, newest first. Amounts and dates only.
create or replace function public.my_payments()
returns table (subscription_id uuid, reference text, amount_pence integer, billing_reason text, paid_at timestamptz)
language sql stable security definer set search_path to 'public'
as $$
  select p.subscription_id, s.reference, p.amount_pence, p.billing_reason, p.paid_at
  from public.website_subscription_payments p
  join public.website_subscriptions s on s.id = p.subscription_id
  where lower(s.email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
  order by p.paid_at desc
  limit 60
$$;
revoke execute on function public.my_payments() from public, anon;
grant execute on function public.my_payments() to authenticated;
