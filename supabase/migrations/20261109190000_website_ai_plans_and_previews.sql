-- The AI steps of a build. A plan is Grok's reading of the customer's brief; a preview is the words for each page of
-- that plan, shown in a fixed design at a private address. Both are drafts until a person releases them. Every write
-- goes through the server (service role); staff can read them. Customers never read these tables: they reach a released
-- preview only through the server, which checks who they are.

create table public.website_plans (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  brief_id uuid not null references public.website_briefs (id) on delete cascade,
  version integer not null,
  plan jsonb not null,
  provider text not null,
  model text not null,
  cost_pence integer not null default 0 check (cost_pence >= 0),
  created_by uuid,
  created_at timestamptz not null default now(),
  unique (brief_id, version)
);

create table public.website_previews (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  brief_id uuid not null references public.website_briefs (id) on delete cascade,
  plan_id uuid not null references public.website_plans (id) on delete cascade,
  version integer not null,
  status text not null default 'draft' check (status in ('draft', 'released', 'withdrawn')),
  pages jsonb not null,
  change_note text not null default '',
  access_token text not null unique,
  provider text not null,
  model text not null,
  cost_pence integer not null default 0 check (cost_pence >= 0),
  created_by uuid,
  released_by uuid,
  released_at timestamptz,
  created_at timestamptz not null default now(),
  unique (brief_id, version)
);

create index website_plans_brief on public.website_plans (brief_id, version desc);
create index website_previews_brief on public.website_previews (brief_id, version desc);

alter table public.website_plans enable row level security;
alter table public.website_previews enable row level security;

create policy "staff read website plans" on public.website_plans for select
  using (is_tenant_member(tenant_id, array['owner', 'admin', 'staff']));

-- Staff read previews, but the access token is left out of the columns the browser may read.
create policy "staff read website previews" on public.website_previews for select
  using (is_tenant_member(tenant_id, array['owner', 'admin', 'staff']));
revoke select on public.website_previews from authenticated;
grant select (id, tenant_id, brief_id, plan_id, version, status, change_note, provider, model, cost_pence, released_at, created_at)
  on public.website_previews to authenticated;

-- The build history can record AI steps.
alter table public.website_brief_events drop constraint if exists website_brief_events_kind_check;
alter table public.website_brief_events add constraint website_brief_events_kind_check
  check (kind in ('created', 'stage', 'approval', 'proposal', 'note', 'version', 'revision', 'preview', 'ai', 'expected'));
