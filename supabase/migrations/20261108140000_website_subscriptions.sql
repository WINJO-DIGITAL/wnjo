-- Website subscriptions and one-off website payments (Stage 6).
--
-- An offer is created by staff from a website quote once the written proposal is agreed. The customer opens a private
-- link (only a hash of its token is stored), agrees to the terms and pays through Stripe Checkout. Stripe webhooks
-- move the row through its states and record each paid invoice once, so the number of successful payments, and the
-- date ownership becomes due, are exact. The server writes everything; staff can only read.

create table public.website_subscriptions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  reference text not null unique check (reference ~ '^WS-[0-9A-F]{6}$'),
  kind text not null default 'subscription' check (kind in ('subscription', 'one_off')),
  status text not null default 'offered'
    check (status in ('offered', 'active', 'past_due', 'cancelled', 'paid', 'expired')),
  email text not null check (char_length(email) between 3 and 254),
  name text not null check (char_length(name) between 1 and 100),
  business_name text check (char_length(business_name) <= 120),
  enquiry_reference text,
  package_code text not null check (package_code in ('bronze', 'silver', 'gold', 'one_off')),
  package_name text not null,
  -- Amounts in pence. A subscription charges setup + one-off extras with its first month; a one-off charges once.
  setup_pence integer not null default 0 check (setup_pence >= 0),
  monthly_pence integer not null default 0 check (monthly_pence >= 0),
  one_off_pence integer not null default 0 check (one_off_pence >= 0),
  quote_snapshot jsonb not null,
  terms_version text not null,
  minimum_term_months integer not null default 12 check (minimum_term_months between 0 and 60),
  ownership_after_payments integer not null default 12 check (ownership_after_payments between 1 and 120),
  offer_token_hash text not null unique,
  offer_expires_at timestamptz not null,
  livemode boolean,
  stripe_checkout_session_id text unique,
  stripe_customer_id text,
  stripe_subscription_id text unique,
  payments_count integer not null default 0 check (payments_count >= 0),
  first_payment_at timestamptz,
  last_payment_at timestamptz,
  ownership_eligible_at timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  cancelled_at timestamptz,
  launched_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((kind = 'subscription' and monthly_pence > 0) or (kind = 'one_off' and one_off_pence > 0))
);

create index website_subscriptions_tenant_status on public.website_subscriptions (tenant_id, status);

-- One row per paid Stripe invoice (or one-off payment), so a webhook retry can never count a payment twice.
create table public.website_subscription_payments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  subscription_id uuid not null references public.website_subscriptions(id) on delete cascade,
  stripe_reference text not null unique,
  amount_pence integer not null check (amount_pence >= 0),
  billing_reason text,
  paid_at timestamptz not null default now()
);

create index website_subscription_payments_subscription on public.website_subscription_payments (subscription_id);

alter table public.website_subscriptions enable row level security;
alter table public.website_subscription_payments enable row level security;

create policy "staff read website subscriptions" on public.website_subscriptions
  for select to authenticated
  using (public.is_tenant_member(tenant_id, array['owner', 'admin', 'staff']));

create policy "staff read website subscription payments" on public.website_subscription_payments
  for select to authenticated
  using (public.is_tenant_member(tenant_id, array['owner', 'admin', 'staff']));

revoke all on public.website_subscriptions from anon, authenticated;
revoke all on public.website_subscription_payments from anon, authenticated;
grant select on public.website_subscriptions to authenticated;
grant select on public.website_subscription_payments to authenticated;
