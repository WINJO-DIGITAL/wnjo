create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,40}$'),
  name text not null check (char_length(name) between 1 and 120),
  status text not null default 'active' check (status in ('active', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tenant_settings (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  currency text not null default 'GBP' check (currency = 'GBP'),
  timezone text not null default 'Europe/London',
  vat_registered boolean not null default false,
  vat_rate_basis_points integer not null default 2000 check (vat_rate_basis_points between 0 and 10000),
  brand jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.tenant_billing_settings (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  billing_email text,
  stripe_account_id text,
  updated_at timestamptz not null default now()
);

create table public.tenant_subscriptions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  plan text not null default 'none',
  status text not null default 'inactive' check (status in ('inactive', 'trialing', 'active', 'past_due', 'cancelled')),
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tenant_subscriptions_tenant_idx on public.tenant_subscriptions (tenant_id);

create table public.tenant_domains (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  domain text not null unique check (domain = lower(domain) and char_length(domain) between 4 and 253),
  verified boolean not null default false,
  created_at timestamptz not null default now()
);
create index tenant_domains_tenant_idx on public.tenant_domains (tenant_id);

-- The agency is the first tenant.
insert into public.tenants (id, slug, name) values ('00000000-0000-4000-8000-000000000001', 'wnjo', 'WNJO');
insert into public.tenant_settings (tenant_id) values ('00000000-0000-4000-8000-000000000001');
insert into public.tenant_billing_settings (tenant_id) values ('00000000-0000-4000-8000-000000000001');
insert into public.tenant_subscriptions (tenant_id, plan, status) values ('00000000-0000-4000-8000-000000000001', 'none', 'inactive');
