-- Deposits: the 50% payment a client makes when they accept a quote (no VAT).
--
-- One deposit per accepted quote. The server creates it and marks it paid when Stripe confirms payment;
-- browsers can only read it. Clients see deposits on their own quotes; staff see their agency's deposits.

create table public.deposits (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  quote_acceptance_id uuid not null unique references public.quote_acceptances(id) on delete restrict,
  amount_pence integer not null check (amount_pence > 0),
  currency text not null default 'gbp' check (currency = 'gbp'),
  status text not null default 'pending' check (status in ('pending', 'paid', 'expired')),
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  check ((status = 'paid') = (paid_at is not null))
);

alter table public.deposits enable row level security;

create policy "staff read deposits" on public.deposits
  for select to authenticated
  using (public.is_tenant_member(tenant_id, array['owner', 'admin', 'staff']));

create policy "clients read deposits on their quotes" on public.deposits
  for select to authenticated
  using (
    exists (
      select 1
      from public.quote_acceptances a
      join public.quotes q on q.id = a.quote_id
      where a.id = deposits.quote_acceptance_id and public.is_org_member(q.organization_id)
    )
  );

revoke all on public.deposits from anon, authenticated;
grant select on public.deposits to authenticated;
