alter table public.orders add column tenant_id uuid references public.tenants(id) on delete cascade;
update public.orders set tenant_id = '00000000-0000-4000-8000-000000000001' where tenant_id is null;
alter table public.orders alter column tenant_id set not null;
create index orders_tenant_idx on public.orders (tenant_id);

alter table public.order_updates add column tenant_id uuid references public.tenants(id) on delete cascade;
update public.order_updates set tenant_id = '00000000-0000-4000-8000-000000000001' where tenant_id is null;
alter table public.order_updates alter column tenant_id set not null;
create index order_updates_tenant_idx on public.order_updates (tenant_id);

alter table public.enquiries add column tenant_id uuid references public.tenants(id) on delete cascade;
update public.enquiries set tenant_id = '00000000-0000-4000-8000-000000000001' where tenant_id is null;
alter table public.enquiries alter column tenant_id set not null;
create index enquiries_tenant_idx on public.enquiries (tenant_id);

create policy "staff read orders" on public.orders for select to authenticated
  using (public.is_tenant_member(tenant_id, array['owner', 'admin', 'staff']));
create policy "staff update orders" on public.orders for update to authenticated
  using (public.is_tenant_member(tenant_id, array['owner', 'admin', 'staff']))
  with check (public.is_tenant_member(tenant_id, array['owner', 'admin', 'staff']));

create policy "staff read order updates" on public.order_updates for select to authenticated
  using (public.is_tenant_member(tenant_id, array['owner', 'admin', 'staff']));

create policy "staff read enquiries" on public.enquiries for select to authenticated
  using (public.is_tenant_member(tenant_id, array['owner', 'admin', 'staff']));
create policy "staff update enquiries" on public.enquiries for update to authenticated
  using (public.is_tenant_member(tenant_id, array['owner', 'admin', 'staff']))
  with check (public.is_tenant_member(tenant_id, array['owner', 'admin', 'staff']));

revoke insert, delete on public.orders, public.order_updates, public.enquiries from authenticated;
grant update on public.orders, public.enquiries to authenticated;
