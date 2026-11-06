-- Approvals and revision requests (Phase 3b). Staff ask a client to approve something on a project.
-- The client approves it or asks for changes. Each decision is recorded once and cannot be changed.

create table public.approval_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  description text not null default '' check (char_length(description) <= 5000),
  kind text not null check (kind in ('milestone', 'deliverable', 'design')),
  status text not null default 'open' check (status in ('open', 'approved', 'changes_requested', 'withdrawn')),
  requested_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
create index approval_requests_project_idx on public.approval_requests (project_id, created_at desc);

create table public.approval_responses (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  approval_request_id uuid not null unique references public.approval_requests(id) on delete restrict,
  responder_user_id uuid references auth.users(id) on delete set null,
  responder_email text not null,
  decision text not null check (decision in ('approve', 'request_changes')),
  comment text not null default '' check (char_length(comment) <= 5000),
  created_at timestamptz not null default now(),
  check (decision = 'approve' or char_length(comment) > 0)
);

create table public.revision_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  approval_request_id uuid references public.approval_requests(id) on delete set null,
  body text not null check (char_length(body) between 1 and 5000),
  status text not null default 'open' check (status in ('open', 'in_progress', 'done')),
  created_at timestamptz not null default now()
);
create index revision_requests_project_idx on public.revision_requests (project_id, created_at desc);

alter table public.approval_requests enable row level security;
alter table public.approval_responses enable row level security;
alter table public.revision_requests enable row level security;

grant select on public.approval_requests, public.approval_responses, public.revision_requests to authenticated;
grant insert on public.approval_requests to authenticated;
grant update (status, decided_at) on public.approval_requests to authenticated;
grant update (status) on public.revision_requests to authenticated;
grant insert on public.revision_requests to authenticated;
revoke delete on public.approval_requests, public.approval_responses, public.revision_requests from authenticated;

-- Staff manage approvals for their agency. Clients see approvals on projects their organisation owns.
create policy "staff read approval requests" on public.approval_requests for select to authenticated
  using (
    public.is_tenant_member(tenant_id, array['owner', 'admin', 'staff'])
    or exists (select 1 from public.projects p where p.id = approval_requests.project_id and public.is_org_member(p.organization_id))
  );
create policy "staff create approval requests" on public.approval_requests for insert to authenticated
  with check (
    public.is_tenant_member(tenant_id, array['owner', 'admin', 'staff'])
    and status = 'open'
    and decided_at is null
  );
create policy "staff update approval requests" on public.approval_requests for update to authenticated
  using (public.is_tenant_member(tenant_id, array['owner', 'admin', 'staff']))
  with check (public.is_tenant_member(tenant_id, array['owner', 'admin', 'staff']));

create policy "read approval responses" on public.approval_responses for select to authenticated
  using (
    public.is_tenant_member(tenant_id, array['owner', 'admin', 'staff'])
    or exists (
      select 1 from public.approval_requests r join public.projects p on p.id = r.project_id
      where r.id = approval_responses.approval_request_id and public.is_org_member(p.organization_id)
    )
  );

create policy "read revision requests" on public.revision_requests for select to authenticated
  using (
    public.is_tenant_member(tenant_id, array['owner', 'admin', 'staff'])
    or exists (select 1 from public.projects p where p.id = revision_requests.project_id and public.is_org_member(p.organization_id))
  );
-- Clients ask for revisions only on projects their organisation owns, as themselves.
create policy "client create revision requests" on public.revision_requests for insert to authenticated
  with check (
    status = 'open'
    and exists (select 1 from public.projects p where p.id = revision_requests.project_id and public.is_org_member(p.organization_id))
  );
create policy "staff update revision requests" on public.revision_requests for update to authenticated
  using (public.is_tenant_member(tenant_id, array['owner', 'admin', 'staff']))
  with check (public.is_tenant_member(tenant_id, array['owner', 'admin', 'staff']));

-- The one place a client can decide an approval. Decisions are final and recorded with the signed-in email.
create or replace function public.decide_approval(p_request_id uuid, p_decision text, p_comment text default '')
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  r record;
  v_email text;
  v_comment text := btrim(coalesce(p_comment, ''));
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'You need to be signed in to respond' using errcode = '42501';
  end if;
  if p_decision not in ('approve', 'request_changes') then
    raise exception 'Choose approve or request changes' using errcode = '22023';
  end if;
  if p_decision = 'request_changes' and char_length(v_comment) < 3 then
    raise exception 'Please tell us what you would like changed' using errcode = '22023';
  end if;
  select r.*, p.organization_id into r
  from public.approval_requests r join public.projects p on p.id = r.project_id
  where r.id = p_request_id
  for update of r;
  if not found or r.organization_id is null or not public.is_org_member(r.organization_id) then
    raise exception 'That approval could not be found' using errcode = 'P0002';
  end if;
  if r.status <> 'open' then
    raise exception 'This approval has already been answered' using errcode = '22023';
  end if;
  select email into v_email from auth.users where id = v_uid;

  insert into public.approval_responses (tenant_id, approval_request_id, responder_user_id, responder_email, decision, comment)
  values (r.tenant_id, r.id, v_uid, coalesce(v_email, ''), p_decision, v_comment)
  returning id into v_id;

  update public.approval_requests
  set status = case when p_decision = 'approve' then 'approved' else 'changes_requested' end,
      decided_at = now()
  where id = r.id;

  insert into public.audit_logs (tenant_id, actor_user_id, action, entity, entity_id, metadata)
  values (r.tenant_id, v_uid, 'approval.' || p_decision, 'approval_requests', r.id::text,
    jsonb_build_object('response_id', v_id));
  return v_id;
end;
$$;

revoke execute on function public.decide_approval(uuid, text, text) from public, anon;
grant execute on function public.decide_approval(uuid, text, text) to authenticated;
