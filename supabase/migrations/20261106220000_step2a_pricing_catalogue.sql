-- Pricing catalogue: all prices live here, owned by each tenant. Amounts are integer pence.
create table public.pricing_packages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  code text not null check (code ~ '^[a-z][a-z0-9_]{1,40}$'),
  name text not null check (char_length(name) between 1 and 80),
  summary text not null default '',
  base_price_pence integer not null check (base_price_pence >= 0),
  page_limit integer check (page_limit is null or page_limit > 0),
  included_design text not null check (included_design in ('refined', 'distinctive', 'signature')),
  includes text[] not null default '{}',
  sort_order integer not null default 0,
  active boolean not null default true,
  updated_at timestamptz not null default now(),
  unique (tenant_id, code)
);

create table public.pricing_features (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  code text not null check (code ~ '^[a-z][a-z0-9_]{1,40}$'),
  label text not null check (char_length(label) between 1 and 120),
  hint text not null default '',
  price_pence integer not null default 0 check (price_pence >= 0),
  requires_scope boolean not null default false,
  included_in_packages text[] not null default '{}',
  active boolean not null default true,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now(),
  unique (tenant_id, code)
);

create table public.pricing_rates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  kind text not null check (kind in ('copy_editing', 'copy_writing', 'imagery', 'branding', 'design')),
  code text not null check (char_length(code) between 1 and 40),
  band text check (band is null or band in ('1-5', '6-12', '13-25')),
  amount_pence integer not null check (amount_pence >= 0),
  updated_at timestamptz not null default now(),
  unique (tenant_id, kind, code, band)
);

create table public.pricing_care_plans (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  code text not null check (char_length(code) between 1 and 40),
  name text not null check (char_length(name) between 1 and 80),
  summary text not null default '',
  monthly_price_pence integer not null check (monthly_price_pence >= 0),
  includes text[] not null default '{}',
  sort_order integer not null default 0,
  active boolean not null default true,
  updated_at timestamptz not null default now(),
  unique (tenant_id, code)
);

create table public.pricing_settings (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  key text not null check (key in ('soon_premium_bp', 'range_spread_bp', 'rounding_step_pence')),
  value integer not null check (value >= 0),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, key)
);

alter table public.pricing_packages enable row level security;
alter table public.pricing_features enable row level security;
alter table public.pricing_rates enable row level security;
alter table public.pricing_care_plans enable row level security;
alter table public.pricing_settings enable row level security;

grant select, insert, update, delete on public.pricing_packages, public.pricing_features, public.pricing_rates,
  public.pricing_care_plans, public.pricing_settings to authenticated;

create policy "staff read packages" on public.pricing_packages for select to authenticated
  using (public.is_tenant_member(tenant_id, array['owner', 'admin', 'staff']));
create policy "admins write packages" on public.pricing_packages for all to authenticated
  using (public.is_tenant_member(tenant_id, array['owner', 'admin']))
  with check (public.is_tenant_member(tenant_id, array['owner', 'admin']));

create policy "staff read features" on public.pricing_features for select to authenticated
  using (public.is_tenant_member(tenant_id, array['owner', 'admin', 'staff']));
create policy "admins write features" on public.pricing_features for all to authenticated
  using (public.is_tenant_member(tenant_id, array['owner', 'admin']))
  with check (public.is_tenant_member(tenant_id, array['owner', 'admin']));

create policy "staff read rates" on public.pricing_rates for select to authenticated
  using (public.is_tenant_member(tenant_id, array['owner', 'admin', 'staff']));
create policy "admins write rates" on public.pricing_rates for all to authenticated
  using (public.is_tenant_member(tenant_id, array['owner', 'admin']))
  with check (public.is_tenant_member(tenant_id, array['owner', 'admin']));

create policy "staff read care plans" on public.pricing_care_plans for select to authenticated
  using (public.is_tenant_member(tenant_id, array['owner', 'admin', 'staff']));
create policy "admins write care plans" on public.pricing_care_plans for all to authenticated
  using (public.is_tenant_member(tenant_id, array['owner', 'admin']))
  with check (public.is_tenant_member(tenant_id, array['owner', 'admin']));

create policy "staff read settings" on public.pricing_settings for select to authenticated
  using (public.is_tenant_member(tenant_id, array['owner', 'admin', 'staff']));
create policy "admins write pricing settings" on public.pricing_settings for all to authenticated
  using (public.is_tenant_member(tenant_id, array['owner', 'admin']))
  with check (public.is_tenant_member(tenant_id, array['owner', 'admin']));
