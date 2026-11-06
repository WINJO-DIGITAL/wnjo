create or replace function public.is_tenant_member(p_tenant uuid, p_roles text[])
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.tenant_members m
    where m.tenant_id = p_tenant and m.user_id = (select auth.uid()) and m.role = any (p_roles)
  );
$$;

create or replace function public.is_org_member(p_org uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = p_org and m.user_id = (select auth.uid())
  );
$$;

create or replace function public.is_platform_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.user_roles r
    where r.user_id = (select auth.uid()) and r.role = 'platform_admin'
  );
$$;

revoke execute on function public.is_tenant_member(uuid, text[]) from public, anon;
revoke execute on function public.is_org_member(uuid) from public, anon;
revoke execute on function public.is_platform_admin() from public, anon;
grant execute on function public.is_tenant_member(uuid, text[]) to authenticated;
grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.is_platform_admin() to authenticated;

alter table public.tenants enable row level security;
alter table public.tenant_settings enable row level security;
alter table public.tenant_billing_settings enable row level security;
alter table public.tenant_subscriptions enable row level security;
alter table public.tenant_domains enable row level security;
alter table public.profiles enable row level security;
alter table public.tenant_members enable row level security;
alter table public.user_roles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.addresses enable row level security;
alter table public.audit_logs enable row level security;

revoke all on public.tenants, public.tenant_settings, public.tenant_billing_settings, public.tenant_subscriptions,
  public.tenant_domains, public.profiles, public.tenant_members, public.user_roles, public.organizations,
  public.organization_members, public.addresses, public.audit_logs from anon, authenticated;

grant select on public.tenants, public.tenant_settings, public.tenant_billing_settings, public.tenant_subscriptions,
  public.tenant_domains, public.tenant_members, public.user_roles, public.organizations, public.organization_members,
  public.addresses, public.audit_logs, public.profiles to authenticated;
grant update on public.tenant_settings, public.profiles to authenticated;

create policy "staff read tenant" on public.tenants for select to authenticated
  using (public.is_tenant_member(id, array['owner', 'admin', 'staff']));

create policy "staff read settings" on public.tenant_settings for select to authenticated
  using (public.is_tenant_member(tenant_id, array['owner', 'admin', 'staff']));
create policy "admins update settings" on public.tenant_settings for update to authenticated
  using (public.is_tenant_member(tenant_id, array['owner', 'admin']))
  with check (public.is_tenant_member(tenant_id, array['owner', 'admin']));

create policy "admins read billing" on public.tenant_billing_settings for select to authenticated
  using (public.is_tenant_member(tenant_id, array['owner', 'admin']));
create policy "admins read subscriptions" on public.tenant_subscriptions for select to authenticated
  using (public.is_tenant_member(tenant_id, array['owner', 'admin']));
create policy "admins read domains" on public.tenant_domains for select to authenticated
  using (public.is_tenant_member(tenant_id, array['owner', 'admin']));

create policy "own profile read" on public.profiles for select to authenticated
  using (user_id = (select auth.uid()));
create policy "own profile update" on public.profiles for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "see own or team memberships" on public.tenant_members for select to authenticated
  using (user_id = (select auth.uid()) or public.is_tenant_member(tenant_id, array['owner', 'admin', 'staff']));

create policy "own roles read" on public.user_roles for select to authenticated
  using (user_id = (select auth.uid()));

create policy "members or staff read organizations" on public.organizations for select to authenticated
  using (public.is_org_member(id) or public.is_tenant_member(tenant_id, array['owner', 'admin', 'staff']));

create policy "see own or tenant org members" on public.organization_members for select to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.organizations o
      where o.id = organization_members.organization_id
        and public.is_tenant_member(o.tenant_id, array['owner', 'admin', 'staff'])
    )
  );

create policy "address access" on public.addresses for select to authenticated
  using (
    user_id = (select auth.uid())
    or (organization_id is not null and public.is_org_member(organization_id))
    or public.is_tenant_member(tenant_id, array['owner', 'admin', 'staff'])
  );

create policy "admins read audit" on public.audit_logs for select to authenticated
  using (public.is_tenant_member(tenant_id, array['owner', 'admin']));
