-- Client invites to an organisation (Phase 3m). Staff invite a new client's email to the organisation a quote is
-- issued to. When that person signs in with the same verified email, they join the organisation and can see the
-- quote. An invite is claimed once and never by a different email.
create table public.organization_invites (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null check (email = lower(email) and char_length(email) between 3 and 320),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  claimed_by uuid references auth.users(id) on delete set null,
  claimed_at timestamptz,
  check ((claimed_at is null) = (claimed_by is null))
);

create unique index organization_invites_open_idx on public.organization_invites (organization_id, email) where claimed_at is null;

alter table public.organization_invites enable row level security;
revoke all on public.organization_invites from anon, authenticated;
grant select on public.organization_invites to authenticated;

create policy "staff read organization invites" on public.organization_invites for select to authenticated
  using (public.is_tenant_member(tenant_id, array['owner', 'admin', 'staff']));

-- Joins the signed-in person to every organisation invited to their verified email. Returns how many were joined.
create or replace function public.claim_org_invites()
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_email text := lower(coalesce((select auth.jwt() ->> 'email'), ''));
  v_user uuid := (select auth.uid());
  r record;
  v_count integer := 0;
begin
  if v_user is null or v_email = '' then return 0; end if;
  for r in
    select id, organization_id from public.organization_invites
    where email = v_email and claimed_at is null
  loop
    insert into public.organization_members (organization_id, user_id, role)
    select r.organization_id, v_user, 'client_member'
    where not exists (
      select 1 from public.organization_members m where m.organization_id = r.organization_id and m.user_id = v_user
    );
    update public.organization_invites set claimed_by = v_user, claimed_at = now() where id = r.id;
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

grant execute on function public.claim_org_invites() to authenticated;
revoke execute on function public.claim_org_invites() from public, anon;
