-- The "Build my website" journey (phases 1 to 3): versioned briefs, a stage history, the four human approvals and
-- bespoke proposals. Every write goes through the server (service role) after a role check; signed-in customers can
-- read only their own briefs and the proposals sent to them. The rules that must never be skipped are enforced here
-- as well, so no route, script or AI agent can bypass them:
--   * a brief can't go live without the latest quality, pricing, contract and publication decisions all approved;
--   * a proposal can't be approved without a matching pricing approval, or sent before it is approved;
--   * approvals, events and brief versions are append-only.

create table public.website_briefs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  reference text not null unique,
  email text not null check (char_length(email) between 3 and 254),
  name text not null default '',
  business_name text not null default '',
  route text not null check (route in ('package', 'proposal')),
  stage text not null default 'brief_received' check (stage in (
    'brief_received', 'reviewing', 'proposal', 'awaiting_payment', 'specification', 'building', 'preview',
    'changes', 'approval', 'live', 'on_hold', 'closed')),
  version integer not null default 1 check (version >= 1),
  draft_id uuid,
  brief jsonb not null,
  answers jsonb not null,
  figures jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index website_briefs_tenant_stage on public.website_briefs (tenant_id, stage, created_at desc);
create index website_briefs_email on public.website_briefs (lower(email));

create table public.website_brief_versions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  brief_id uuid not null references public.website_briefs(id) on delete cascade,
  version integer not null check (version >= 1),
  brief jsonb not null,
  answers jsonb not null,
  changed_by_type text not null check (changed_by_type in ('customer', 'staff', 'system', 'ai')),
  changed_by_user uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (brief_id, version)
);

create table public.website_brief_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  brief_id uuid not null references public.website_briefs(id) on delete cascade,
  kind text not null check (kind in ('created', 'stage', 'approval', 'proposal', 'note', 'version')),
  detail jsonb not null default '{}'::jsonb,
  actor_type text not null check (actor_type in ('customer', 'staff', 'system', 'ai')),
  actor_user uuid references auth.users(id) on delete set null,
  actor_email text,
  created_at timestamptz not null default now()
);
create index website_brief_events_brief on public.website_brief_events (brief_id, created_at);

create table public.website_proposals (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  brief_id uuid not null references public.website_briefs(id) on delete cascade,
  reference text not null unique,
  status text not null default 'draft' check (status in (
    'draft', 'pending_approval', 'approved', 'sent', 'accepted', 'declined', 'withdrawn')),
  source text not null default 'staff' check (source in ('staff', 'ai')),
  summary text not null default '' check (char_length(summary) <= 4000),
  lines jsonb not null default '[]'::jsonb,
  setup_pence integer not null default 0 check (setup_pence >= 0),
  monthly_pence integer not null default 0 check (monthly_pence >= 0),
  one_off_pence integer not null default 0 check (one_off_pence >= 0),
  prepared_by uuid references auth.users(id) on delete set null,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  sent_at timestamptz,
  decided_at timestamptz,
  customer_note text not null default '' check (char_length(customer_note) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index website_proposals_brief on public.website_proposals (brief_id, created_at desc);

create table public.build_approvals (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  brief_id uuid not null references public.website_briefs(id) on delete cascade,
  proposal_id uuid references public.website_proposals(id) on delete set null,
  kind text not null check (kind in ('quality', 'pricing', 'contract', 'publication')),
  decision text not null check (decision in ('approved', 'rejected')),
  note text not null default '' check (char_length(note) <= 2000),
  decided_by uuid not null references auth.users(id) on delete restrict,
  decided_by_email text not null,
  decided_by_role text not null check (decided_by_role in ('owner', 'admin', 'staff')),
  created_at timestamptz not null default now(),
  -- A person must give a reason for turning something down.
  check (decision = 'approved' or char_length(note) > 0),
  -- Only owners and admins decide pricing, contract and publication.
  check (kind = 'quality' or decided_by_role in ('owner', 'admin'))
);
create index build_approvals_brief on public.build_approvals (brief_id, kind, created_at desc);

-- Append-only records. Nobody can edit them, the service role included. Deleting is left to the database owner
-- (a person in the SQL editor), so the app, its API routes and any AI agent can't remove the history.
create or replace function public.refuse_change() returns trigger language plpgsql
set search_path = public as $$
begin
  if tg_op = 'DELETE' and current_user not in ('anon', 'authenticated', 'service_role') then
    return old;
  end if;
  raise exception '% records cannot be changed or deleted', tg_table_name using errcode = '42501';
end $$;

create trigger build_approvals_append_only before update or delete on public.build_approvals
  for each row execute function public.refuse_change();
create trigger website_brief_events_append_only before update or delete on public.website_brief_events
  for each row execute function public.refuse_change();
create trigger website_brief_versions_append_only before update or delete on public.website_brief_versions
  for each row execute function public.refuse_change();

-- No website goes live without the latest decision on all four approvals being "approved".
create or replace function public.guard_brief_live() returns trigger language plpgsql
set search_path = public as $$
declare
  approved_kinds integer;
begin
  if new.stage = 'live' and old.stage is distinct from 'live' then
    select count(*) into approved_kinds from (
      select distinct on (kind) kind, decision
      from public.build_approvals
      where brief_id = new.id
      order by kind, created_at desc
    ) latest
    where decision = 'approved';
    if approved_kinds < 4 then
      raise exception 'A website needs quality, pricing, contract and publication approval before it goes live'
        using errcode = '42501';
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;

create trigger website_briefs_guard_live before update on public.website_briefs
  for each row execute function public.guard_brief_live();

-- A proposal is approved only alongside a pricing approval by the same person, and sent only once approved.
create or replace function public.guard_proposal() returns trigger language plpgsql
set search_path = public as $$
begin
  if new.status = 'approved' and old.status is distinct from 'approved' then
    if new.approved_by is null or not exists (
      select 1 from public.build_approvals a
      where a.proposal_id = new.id and a.kind = 'pricing' and a.decision = 'approved' and a.decided_by = new.approved_by
    ) then
      raise exception 'A proposal needs a pricing approval by an owner or admin' using errcode = '42501';
    end if;
  end if;
  if new.status = 'sent' and old.status is distinct from 'sent' and old.status <> 'approved' then
    raise exception 'Only an approved proposal can be sent' using errcode = '42501';
  end if;
  -- Prices are fixed once a proposal is waiting for approval: a change needs a new draft.
  if old.status <> 'draft' and (
    new.setup_pence <> old.setup_pence or new.monthly_pence <> old.monthly_pence
    or new.one_off_pence <> old.one_off_pence or new.lines <> old.lines
  ) then
    raise exception 'Proposal prices can only change while it is a draft' using errcode = '42501';
  end if;
  new.updated_at := now();
  return new;
end $$;

create trigger website_proposals_guard before update on public.website_proposals
  for each row execute function public.guard_proposal();

-- Access. Writes are server-only; staff read everything in their agency; customers read their own.
alter table public.website_briefs enable row level security;
alter table public.website_brief_versions enable row level security;
alter table public.website_brief_events enable row level security;
alter table public.website_proposals enable row level security;
alter table public.build_approvals enable row level security;

revoke all on public.website_briefs, public.website_brief_versions, public.website_brief_events,
  public.website_proposals, public.build_approvals from anon, authenticated;
grant select on public.website_briefs, public.website_brief_versions, public.website_brief_events,
  public.website_proposals, public.build_approvals to authenticated;

create policy "staff read briefs" on public.website_briefs for select to authenticated
  using (public.is_tenant_member(tenant_id, array['owner', 'admin', 'staff']));
create policy "customers read own briefs" on public.website_briefs for select to authenticated
  using (lower(email) = lower(coalesce((select auth.jwt() ->> 'email'), '')));

create policy "staff read brief versions" on public.website_brief_versions for select to authenticated
  using (public.is_tenant_member(tenant_id, array['owner', 'admin', 'staff']));

create policy "staff read brief events" on public.website_brief_events for select to authenticated
  using (public.is_tenant_member(tenant_id, array['owner', 'admin', 'staff']));
create policy "customers read own stage history" on public.website_brief_events for select to authenticated
  using (
    kind in ('created', 'stage')
    and exists (
      select 1 from public.website_briefs b
      where b.id = website_brief_events.brief_id
        and lower(b.email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
    )
  );

create policy "staff read proposals" on public.website_proposals for select to authenticated
  using (public.is_tenant_member(tenant_id, array['owner', 'admin', 'staff']));
create policy "customers read proposals sent to them" on public.website_proposals for select to authenticated
  using (
    status in ('sent', 'accepted', 'declined')
    and exists (
      select 1 from public.website_briefs b
      where b.id = website_proposals.brief_id
        and lower(b.email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
    )
  );

create policy "staff read approvals" on public.build_approvals for select to authenticated
  using (public.is_tenant_member(tenant_id, array['owner', 'admin', 'staff']));

-- Files customers attach to a brief. Private; uploaded through one-time links and read through signed links only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('brief-files', 'brief-files', false, 20971520, array[
  'image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'])
on conflict (id) do nothing;
