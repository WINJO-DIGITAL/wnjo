-- Project files (Phase 3c). Files live in a private storage bucket. Each file has a metadata row here
-- that decides who may see it. Clients see files attached to their organisation's projects and
-- customer-visible files only. Internal files are staff-only.

create table public.project_files (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  storage_path text not null unique,
  file_name text not null check (char_length(file_name) between 1 and 255),
  mime_type text not null check (char_length(mime_type) between 3 and 120),
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 52428800),
  is_internal boolean not null default false,
  uploaded_by uuid references auth.users(id) on delete set null,
  uploaded_by_kind text not null check (uploaded_by_kind in ('staff', 'client')),
  created_at timestamptz not null default now()
);
create index project_files_project_idx on public.project_files (project_id, created_at desc);

alter table public.project_files enable row level security;
grant select on public.project_files to authenticated;
grant insert on public.project_files to authenticated;
revoke update, delete on public.project_files from authenticated;

create policy "staff read project files" on public.project_files for select to authenticated
  using (public.is_tenant_member(tenant_id, array['owner', 'admin', 'staff']));
create policy "clients read customer-visible project files" on public.project_files for select to authenticated
  using (
    is_internal = false
    and exists (select 1 from public.projects p where p.id = project_files.project_id and public.is_org_member(p.organization_id))
  );

-- Staff upload anything for their agency. Clients upload only to their own organisation's projects, as themselves, customer-visible.
create policy "staff upload project files" on public.project_files for insert to authenticated
  with check (
    public.is_tenant_member(tenant_id, array['owner', 'admin', 'staff'])
    and uploaded_by = (select auth.uid())
    and uploaded_by_kind = 'staff'
  );
create policy "clients upload project files" on public.project_files for insert to authenticated
  with check (
    is_internal = false
    and uploaded_by = (select auth.uid())
    and uploaded_by_kind = 'client'
    and exists (select 1 from public.projects p where p.id = project_files.project_id and public.is_org_member(p.organization_id))
  );

-- Private bucket: nothing is public. Access is granted only through the policies below, and by signed URLs
-- that the server creates after checking the metadata row above.
insert into storage.buckets (id, name, public, file_size_limit)
values ('project-files', 'project-files', false, 52428800)
on conflict (id) do nothing;
