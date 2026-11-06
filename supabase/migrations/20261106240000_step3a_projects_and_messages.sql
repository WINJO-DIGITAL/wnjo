-- Projects are the central record of delivery. Messages are project-specific; internal notes are
-- messages flagged is_internal, and clients can never read them.
-- NOTE: the internal project fields (status, priority) are moved to project_internal by
-- supabase/pending/20261106240100_step3a_split_internal_project_fields.sql, which is not yet applied.
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  name text not null check (char_length(name) between 1 and 160),
  status text not null default 'planning' check (status in ('planning', 'in_progress', 'on_hold', 'completed', 'archived')),
  customer_status text not null default 'Being planned' check (char_length(customer_status) between 1 and 80),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  target_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index projects_tenant_idx on public.projects (tenant_id);
create index projects_org_idx on public.projects (organization_id);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  subject text not null check (char_length(subject) between 1 and 160),
  created_at timestamptz not null default now()
);
create index conversations_project_idx on public.conversations (project_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_user_id uuid references auth.users(id) on delete set null,
  sender_kind text not null check (sender_kind in ('staff', 'client', 'system')),
  is_internal boolean not null default false,
  body text not null check (char_length(body) between 1 and 5000),
  created_at timestamptz not null default now()
);
create index messages_conversation_idx on public.messages (conversation_id, created_at);

alter table public.projects enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

grant select on public.projects, public.conversations, public.messages to authenticated;
grant insert on public.conversations, public.messages to authenticated;
grant update on public.projects to authenticated;
revoke delete on public.projects, public.conversations, public.messages from authenticated;

create policy "staff read projects" on public.projects for select to authenticated
  using (public.is_tenant_member(tenant_id, array['owner', 'admin', 'staff']) or public.is_org_member(organization_id));
create policy "staff write projects" on public.projects for update to authenticated
  using (public.is_tenant_member(tenant_id, array['owner', 'admin', 'staff']))
  with check (public.is_tenant_member(tenant_id, array['owner', 'admin', 'staff']));

create policy "staff read conversations" on public.conversations for select to authenticated
  using (
    public.is_tenant_member(tenant_id, array['owner', 'admin', 'staff'])
    or exists (select 1 from public.projects p where p.id = conversations.project_id and public.is_org_member(p.organization_id))
  );
create policy "staff create conversations" on public.conversations for insert to authenticated
  with check (public.is_tenant_member(tenant_id, array['owner', 'admin', 'staff']));

create policy "staff read all messages, clients read customer-visible ones" on public.messages for select to authenticated
  using (
    public.is_tenant_member(tenant_id, array['owner', 'admin', 'staff'])
    or (
      is_internal = false
      and exists (
        select 1 from public.conversations c
        join public.projects p on p.id = c.project_id
        where c.id = messages.conversation_id and public.is_org_member(p.organization_id)
      )
    )
  );

create policy "staff post any message" on public.messages for insert to authenticated
  with check (
    public.is_tenant_member(tenant_id, array['owner', 'admin', 'staff'])
    and sender_user_id = (select auth.uid())
    and sender_kind = 'staff'
  );

create policy "clients post customer-visible messages" on public.messages for insert to authenticated
  with check (
    is_internal = false
    and sender_kind = 'client'
    and sender_user_id = (select auth.uid())
    and exists (
      select 1 from public.conversations c
      join public.projects p on p.id = c.project_id
      where c.id = messages.conversation_id and public.is_org_member(p.organization_id)
    )
  );

revoke update on public.messages from authenticated;
revoke update on public.conversations from authenticated;

create or replace function public.messages_guard()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.sender_kind = 'system' and auth.role() = 'authenticated' then
    raise exception 'system messages can only be created by the server' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger messages_guard_insert before insert on public.messages
  for each row execute function public.messages_guard();
