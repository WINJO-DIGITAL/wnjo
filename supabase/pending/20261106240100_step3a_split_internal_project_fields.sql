-- PENDING: not applied. The Supabase server asked a question during the apply and no answer arrived,
-- so this migration was left unapplied. Apply it (or delete it) once the question is resolved.
-- Moves internal project fields into their own table so clients can never read them.
create table public.project_internal (
  project_id uuid primary key references public.projects(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  status text not null default 'planning' check (status in ('planning', 'in_progress', 'on_hold', 'completed', 'archived')),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  internal_notes text not null default '' check (char_length(internal_notes) <= 20000),
  updated_at timestamptz not null default now()
);

alter table public.project_internal enable row level security;
grant select, insert, update on public.project_internal to authenticated;
create policy "staff read internal project fields" on public.project_internal for select to authenticated
  using (public.is_tenant_member(tenant_id, array['owner', 'admin', 'staff']));
create policy "staff write internal project fields" on public.project_internal for all to authenticated
  using (public.is_tenant_member(tenant_id, array['owner', 'admin', 'staff']))
  with check (public.is_tenant_member(tenant_id, array['owner', 'admin', 'staff']));

alter table public.projects drop column status, drop column priority;

revoke select on public.projects from authenticated;
grant select (id, tenant_id, organization_id, order_id, name, customer_status, target_date, created_at, updated_at)
  on public.projects to authenticated;
grant update (name, customer_status, target_date, updated_at) on public.projects to authenticated;
