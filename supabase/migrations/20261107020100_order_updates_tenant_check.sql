-- An order update must carry the same agency as its order, not just any agency the poster belongs to.
drop policy if exists "staff post order updates" on public.order_updates;

create policy "staff post order updates" on public.order_updates
  for insert to authenticated
  with check (
    exists (
      select 1 from public.orders o
      where o.id = order_updates.order_id
        and o.tenant_id = order_updates.tenant_id
        and public.is_tenant_member(o.tenant_id, array['owner', 'admin', 'staff'])
    )
  );
