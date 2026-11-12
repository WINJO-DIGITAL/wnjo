-- Template builds: a customer's answers filled into a sector template. The server stores the checked answers, the
-- content the AI wrote around them, and the result of the automatic checks. A build is a draft until a person
-- releases it. Same rules as website_previews: writes go through the server (service role), staff can read, and the
-- access token is not readable from the browser. Customers reach a released build only through the server.

create table public.website_site_builds (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  brief_id uuid not null references public.website_briefs (id) on delete cascade,
  version integer not null,
  sector text not null,
  -- The answers as submitted, so a revision can run again from them.
  answers jsonb not null,
  content jsonb not null,
  -- Problems the automatic checks found. Empty when the build passed.
  issues jsonb not null default '[]'::jsonb,
  checks_ok boolean not null default false,
  status text not null default 'draft' check (status in ('draft', 'released', 'withdrawn')),
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

create index website_site_builds_brief on public.website_site_builds (brief_id, version desc);

alter table public.website_site_builds enable row level security;

create policy "staff read website site builds" on public.website_site_builds for select
  using (is_tenant_member(tenant_id, array['owner', 'admin', 'staff']));
revoke select on public.website_site_builds from authenticated;
grant select (id, tenant_id, brief_id, version, sector, checks_ok, status, change_note, provider, model, cost_pence, released_at, created_at)
  on public.website_site_builds to authenticated;
