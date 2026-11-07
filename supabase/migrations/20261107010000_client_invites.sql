-- Linking a customer to their order (staff-issued invites, claimed by the customer after sign-in).
--
-- Staff create an invite for a customer's email, linked to an order and/or an organisation. When the
-- customer signs in with that email (verified by the emailed link), claim_client_invites() attaches the
-- order to their account and adds them to the organisation, so they can see the project and quotes.
-- Staff never see anyone's account; the customer never chooses which order they get.

-- An order can exist before the customer has an account.
alter table public.orders alter column customer_id drop not null;

create table public.client_invites (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  email text not null check (email = lower(btrim(email)) and char_length(email) between 3 and 320),
  order_id uuid references public.orders(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  claimed_at timestamptz,
  claimed_by uuid references auth.users(id) on delete set null,
  check (order_id is not null or organization_id is not null)
);
create index client_invites_email_idx on public.client_invites (email) where claimed_at is null;
create index client_invites_tenant_idx on public.client_invites (tenant_id, created_at desc);

alter table public.client_invites enable row level security;

-- Staff can read and create invites for their own agency, and only for its orders and organisations.
create policy "staff read client invites" on public.client_invites
  for select to authenticated
  using (public.is_tenant_member(tenant_id, array['owner', 'admin', 'staff']));

create policy "staff create client invites" on public.client_invites
  for insert to authenticated
  with check (
    public.is_tenant_member(tenant_id, array['owner', 'admin', 'staff'])
    and (order_id is null or exists (
      select 1 from public.orders o where o.id = client_invites.order_id and o.tenant_id = client_invites.tenant_id))
    and (organization_id is null or exists (
      select 1 from public.organizations g where g.id = client_invites.organization_id and g.tenant_id = client_invites.tenant_id))
  );

-- Invites are only ever claimed through the function below, never edited from the browser.
revoke all on public.client_invites from anon, authenticated;
grant select, insert on public.client_invites to authenticated;

-- Called by a signed-in customer. Claims every open invite that matches their verified email.
-- An order already belonging to someone else is never taken over; that invite is left unclaimed.
create or replace function public.claim_client_invites()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  mail text := lower(btrim(coalesce(auth.jwt() ->> 'email', '')));
  inv record;
  claimed int := 0;
begin
  if me is null or mail = '' then
    raise exception 'Sign in with your email first' using errcode = '42501';
  end if;

  for inv in
    select * from public.client_invites
    where claimed_at is null and email = mail
    order by created_at
  loop
    if inv.order_id is not null then
      -- Skip an order that already belongs to a different customer.
      if exists (
        select 1 from public.orders o
        where o.id = inv.order_id and o.customer_id is not null and o.customer_id <> me
      ) then
        continue;
      end if;
      update public.orders set customer_id = me where id = inv.order_id and customer_id is null;
      -- Give access to the organisations of any projects built for this order.
      insert into public.organization_members (organization_id, user_id, role)
        select distinct p.organization_id, me, 'client_member'
        from public.projects p
        where p.order_id = inv.order_id and p.organization_id is not null
      on conflict (organization_id, user_id) do nothing;
    end if;

    if inv.organization_id is not null then
      insert into public.organization_members (organization_id, user_id, role)
      values (inv.organization_id, me, 'client_member')
      on conflict (organization_id, user_id) do nothing;
    end if;

    update public.client_invites set claimed_at = now(), claimed_by = me where id = inv.id;
    claimed := claimed + 1;
  end loop;

  return claimed;
end;
$$;

revoke execute on function public.claim_client_invites() from public, anon;
grant execute on function public.claim_client_invites() to authenticated;
