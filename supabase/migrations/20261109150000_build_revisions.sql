-- Revisions: a customer's requests for changes to their website preview, kept as a numbered history on each build.
-- A request's wording can never be edited or deleted (so the history is trustworthy); staff answer it by moving it
-- from waiting to in progress, then done or declined. A decline must say why. Customers read their own revisions;
-- every write goes through the server after a check of who is asking.

create table public.build_revisions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  brief_id uuid not null references public.website_briefs(id) on delete cascade,
  number integer not null check (number >= 1),
  status text not null default 'open' check (status in ('open', 'in_progress', 'done', 'declined')),
  request text not null check (char_length(request) between 1 and 2000),
  response text not null default '' check (char_length(response) <= 2000),
  requested_by_email text not null,
  resolved_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz,
  unique (brief_id, number),
  -- Turning a request down needs a reason the customer can read.
  check (status <> 'declined' or char_length(response) > 0),
  -- A finished revision has a finish time; an unfinished one doesn't.
  check ((status in ('done', 'declined')) = (resolved_at is not null))
);
create index build_revisions_brief on public.build_revisions (brief_id, number);

-- Numbers run 1, 2, 3 per build. The build row is locked briefly so two requests at once can't take the same number.
create or replace function public.assign_revision_number() returns trigger language plpgsql
set search_path = public as $$
begin
  perform 1 from public.website_briefs where id = new.brief_id for update;
  select coalesce(max(number), 0) + 1 into new.number from public.build_revisions where brief_id = new.brief_id;
  return new;
end $$;

create trigger build_revisions_number before insert on public.build_revisions
  for each row execute function public.assign_revision_number();

-- The request itself is fixed. Only its status, the reply and the finish details can change, and a finished
-- revision is final.
create or replace function public.guard_revision() returns trigger language plpgsql
set search_path = public as $$
begin
  if new.brief_id is distinct from old.brief_id
     or new.tenant_id is distinct from old.tenant_id
     or new.number is distinct from old.number
     or new.request is distinct from old.request
     or new.requested_by_email is distinct from old.requested_by_email
     or new.created_at is distinct from old.created_at then
    raise exception 'A revision request can''t be edited, only answered' using errcode = '42501';
  end if;
  if old.status in ('done', 'declined')
     and (new.status is distinct from old.status or new.response is distinct from old.response) then
    raise exception 'A finished revision can''t be changed' using errcode = '42501';
  end if;
  new.updated_at := now();
  return new;
end $$;

create trigger build_revisions_guard before update on public.build_revisions
  for each row execute function public.guard_revision();

-- Nobody can delete a revision from the app (refuse_change is the append-only helper from the briefs migration).
create trigger build_revisions_no_delete before delete on public.build_revisions
  for each row execute function public.refuse_change();

-- The build's history now also records revisions and the customer's approval of their preview.
alter table public.website_brief_events drop constraint website_brief_events_kind_check;
alter table public.website_brief_events add constraint website_brief_events_kind_check
  check (kind in ('created', 'stage', 'approval', 'proposal', 'note', 'version', 'revision', 'preview'));

-- Access. Writes are server-only; staff read everything in their agency; customers read their own revisions.
alter table public.build_revisions enable row level security;
revoke all on public.build_revisions from anon, authenticated;
grant select on public.build_revisions to authenticated;

create policy "staff read revisions" on public.build_revisions for select to authenticated
  using (public.is_tenant_member(tenant_id, array['owner', 'admin', 'staff']));
create policy "customers read own revisions" on public.build_revisions for select to authenticated
  using (
    exists (
      select 1 from public.website_briefs b
      where b.id = build_revisions.brief_id
        and lower(b.email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
    )
  );
