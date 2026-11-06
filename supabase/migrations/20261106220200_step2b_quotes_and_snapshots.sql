create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  reference text not null unique check (reference ~ '^Q-[0-9A-F]{6,12}$'),
  enquiry_id uuid references public.enquiries(id) on delete set null,
  organization_id uuid references public.organizations(id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'sent', 'accepted', 'declined', 'expired', 'superseded')),
  expires_at timestamptz,
  latest_version integer not null default 0 check (latest_version >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index quotes_tenant_idx on public.quotes (tenant_id, created_at desc);
create index quotes_org_idx on public.quotes (organization_id);

create table public.quote_versions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  quote_id uuid not null references public.quotes(id) on delete cascade,
  version integer not null check (version > 0),
  answers jsonb not null,
  catalogue_snapshot jsonb not null,
  package_code text not null,
  build_pence integer not null check (build_pence >= 0),
  range_low_pence integer not null check (range_low_pence >= 0),
  range_high_pence integer not null check (range_high_pence >= range_low_pence),
  monthly_pence integer not null default 0 check (monthly_pence >= 0),
  requires_scope boolean not null,
  scope_reasons text[] not null default '{}',
  currency text not null default 'GBP' check (currency = 'GBP'),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (quote_id, version)
);
create index quote_versions_tenant_idx on public.quote_versions (tenant_id);

create table public.quote_version_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  quote_version_id uuid not null references public.quote_versions(id) on delete cascade,
  position integer not null check (position >= 0),
  label text not null check (char_length(label) between 1 and 160),
  amount_pence integer not null,
  unique (quote_version_id, position)
);
create index quote_version_items_version_idx on public.quote_version_items (quote_version_id);

create table public.quote_acceptances (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  quote_id uuid not null references public.quotes(id) on delete cascade,
  quote_version_id uuid not null unique references public.quote_versions(id) on delete restrict,
  accepted_by uuid references auth.users(id) on delete set null,
  accepted_name text not null check (char_length(accepted_name) between 1 and 200),
  accepted_email text not null check (char_length(accepted_email) between 3 and 320),
  ip_address text,
  user_agent text check (char_length(user_agent) <= 400),
  terms_version text not null,
  accepted_at timestamptz not null default now()
);

create or replace function public.forbid_change()
returns trigger language plpgsql as $$
begin
  raise exception '% rows are permanent and cannot be changed or deleted', tg_table_name
    using errcode = 'insufficient_privilege';
end;
$$;

create trigger quote_versions_immutable before update or delete on public.quote_versions
  for each row execute function public.forbid_change();
create trigger quote_version_items_immutable before update or delete on public.quote_version_items
  for each row execute function public.forbid_change();
create trigger quote_acceptances_immutable before update or delete on public.quote_acceptances
  for each row execute function public.forbid_change();

alter table public.quotes enable row level security;
alter table public.quote_versions enable row level security;
alter table public.quote_version_items enable row level security;
alter table public.quote_acceptances enable row level security;

grant select on public.quotes, public.quote_versions, public.quote_version_items, public.quote_acceptances to authenticated;
grant update on public.quotes to authenticated;

create policy "staff read quotes" on public.quotes for select to authenticated
  using (public.is_tenant_member(tenant_id, array['owner', 'admin', 'staff']) or public.is_org_member(organization_id));
create policy "staff update quotes" on public.quotes for update to authenticated
  using (public.is_tenant_member(tenant_id, array['owner', 'admin', 'staff']))
  with check (public.is_tenant_member(tenant_id, array['owner', 'admin', 'staff']));

create policy "staff or client read versions" on public.quote_versions for select to authenticated
  using (
    public.is_tenant_member(tenant_id, array['owner', 'admin', 'staff'])
    or exists (select 1 from public.quotes q where q.id = quote_versions.quote_id and public.is_org_member(q.organization_id))
  );

create policy "staff or client read version items" on public.quote_version_items for select to authenticated
  using (
    public.is_tenant_member(tenant_id, array['owner', 'admin', 'staff'])
    or exists (
      select 1 from public.quote_versions v
      join public.quotes q on q.id = v.quote_id
      where v.id = quote_version_items.quote_version_id and public.is_org_member(q.organization_id)
    )
  );

create policy "staff or client read acceptances" on public.quote_acceptances for select to authenticated
  using (
    public.is_tenant_member(tenant_id, array['owner', 'admin', 'staff'])
    or exists (select 1 from public.quotes q where q.id = quote_acceptances.quote_id and public.is_org_member(q.organization_id))
  );

revoke insert, update, delete on public.quote_versions, public.quote_version_items, public.quote_acceptances from authenticated;
revoke insert, delete on public.quotes from authenticated;
